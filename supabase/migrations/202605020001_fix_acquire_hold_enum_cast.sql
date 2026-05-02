drop function if exists public.acquire_seat_hold(uuid, uuid, text, uuid);

create or replace function public.acquire_seat_hold(
  p_match_id uuid,
  p_seat_id uuid,
  p_session_id text default null,
  p_gate_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_id text := nullif(trim(coalesce(p_session_id, '')), '');
  v_hold_token uuid;
  v_existing_hold_token uuid;
  v_existing_hold_expires_at timestamptz;
  v_existing_hold_status public.hold_status := 'active'::public.hold_status;
  v_existing_hold_type text := 'initial';
  v_ticketing_mode text := 'free';
  v_max_tickets integer := 4;
  v_initial_hold_seconds integer := 90;
  v_allow_guest_hold boolean := true;
  v_require_login_before_hold boolean := false;
  v_expires_at timestamptz;
  v_owner_hold_count integer := 0;
  v_seat_row record;
begin
  perform public.cleanup_expired_holds(p_match_id);

  select
    coalesce(ms.ticketing_mode, 'free'),
    coalesce(ms.max_tickets_per_user, 4),
    coalesce(ms.initial_hold_seconds, 90),
    coalesce(ms.allow_guest_hold, true),
    coalesce(ms.require_login_before_hold, false)
  into
    v_ticketing_mode,
    v_max_tickets,
    v_initial_hold_seconds,
    v_allow_guest_hold,
    v_require_login_before_hold
  from public.matches m
  left join public.match_settings ms on ms.match_id = m.id
  where m.id = p_match_id
    and m.status in ('published', 'closed');

  if not found then
    raise exception 'Evenimentul nu mai permite rezervari.';
  end if;

  if exists (
    select 1
    from public.match_settings ms
    where ms.match_id = p_match_id
      and ms.opens_at is not null
      and now() < ms.opens_at
  ) then
    raise exception 'Rezervarile nu au fost deschise inca.';
  end if;

  if exists (
    select 1
    from public.match_settings ms
    where ms.match_id = p_match_id
      and ms.closes_at is not null
      and now() > ms.closes_at
  ) then
    raise exception 'Rezervarile pentru acest eveniment s-au inchis.';
  end if;

  if v_user_id is null and (not v_allow_guest_hold or v_require_login_before_hold) then
    raise exception 'Autentificarea este necesara inainte de selectarea locurilor.';
  end if;

  if v_user_id is null and v_session_id is null then
    raise exception 'Sesiunea de hold nu a putut fi initializata.';
  end if;

  select
    seat.id as seat_id,
    sector.id as sector_id,
    coalesce(sector_override.is_enabled, true) as sector_enabled,
    seat.is_disabled,
    seat.is_obstructed,
    seat.is_internal_only
  into v_seat_row
  from public.seats seat
  join public.stadium_sectors sector on sector.id = seat.sector_id
  join public.matches m on m.id = p_match_id and m.stadium_id = sector.stadium_id
  left join public.match_sector_overrides sector_override
    on sector_override.match_id = p_match_id
   and sector_override.sector_id = sector.id
  where seat.id = p_seat_id
  for update of seat;

  if v_seat_row.seat_id is null then
    raise exception 'Locul ales nu apartine acestui eveniment.';
  end if;

  if not v_seat_row.sector_enabled or v_seat_row.is_disabled or v_seat_row.is_obstructed or v_seat_row.is_internal_only then
    raise exception 'Locul ales nu este disponibil pentru selectie.';
  end if;

  if exists (
    select 1
    from public.match_seat_overrides override
    where override.match_id = p_match_id
      and override.seat_id = p_seat_id
      and (
        override.status = 'blocked'
        or (override.status = 'admin_hold' and (override.expires_at is null or override.expires_at > now()))
      )
  ) then
    raise exception 'Locul ales este indisponibil.';
  end if;

  if exists (
    select 1
    from public.tickets t
    where t.match_id = p_match_id
      and t.seat_id = p_seat_id
      and t.status in ('active', 'used', 'blocked')
  ) then
    raise exception 'Acest loc nu mai este disponibil.';
  end if;

  select hold_token
  into v_existing_hold_token
  from public.seat_holds
  where match_id = p_match_id
    and seat_id = p_seat_id
    and status in ('active', 'confirmed')
    and expires_at > now()
    and (
      (v_user_id is not null and user_id is distinct from v_user_id)
      or (v_user_id is null and user_id is not null)
      or (
        coalesce(session_id, '') <> coalesce(v_session_id, '')
        and not (v_user_id is not null and user_id = v_user_id)
      )
    )
  limit 1;

  if v_existing_hold_token is not null then
    raise exception 'Acest loc tocmai a fost selectat de alt utilizator. Te rugam sa alegi alt loc.';
  end if;

  select count(*)
  into v_owner_hold_count
  from public.seat_holds hold
  where hold.match_id = p_match_id
    and hold.status in ('active', 'confirmed')
    and hold.expires_at > now()
    and (
      hold.user_id = v_user_id
      or (hold.session_id = v_session_id)
    );

  if v_owner_hold_count >= v_max_tickets then
    raise exception 'Ai atins limita maxima de locuri care pot fi blocate simultan.';
  end if;

  select hold_token, expires_at, status, hold_type
  into v_hold_token, v_existing_hold_expires_at, v_existing_hold_status, v_existing_hold_type
  from public.seat_holds hold
  where hold.match_id = p_match_id
    and hold.status in ('active', 'confirmed')
    and hold.expires_at > now()
    and (
      hold.user_id = v_user_id
      or (hold.session_id = v_session_id)
    )
  order by hold.updated_at desc, hold.created_at desc
  limit 1;

  if v_hold_token is null then
    v_hold_token := gen_random_uuid();
    v_existing_hold_status := 'active'::public.hold_status;
    v_existing_hold_type := 'initial';
    v_expires_at := now() + make_interval(secs => v_initial_hold_seconds);
  else
    v_expires_at := v_existing_hold_expires_at;
  end if;

  insert into public.seat_holds (
    match_id,
    seat_id,
    user_id,
    session_id,
    hold_token,
    gate_id,
    status,
    hold_type,
    expires_at,
    updated_at
  )
  values (
    p_match_id,
    p_seat_id,
    v_user_id,
    v_session_id,
    v_hold_token,
    p_gate_id,
    v_existing_hold_status,
    v_existing_hold_type,
    v_expires_at,
    now()
  );

  return public.get_active_hold_summary(p_match_id, v_session_id);
exception
  when unique_violation then
    raise exception 'Acest loc tocmai a fost selectat de alt utilizator. Te rugam sa alegi alt loc.';
end;
$$;
