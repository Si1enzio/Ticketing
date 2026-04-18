alter table public.profiles
add column if not exists can_reserve boolean not null default false;

drop policy if exists profiles_update_own_or_admin on public.profiles;
drop policy if exists profiles_update_admin_only on public.profiles;

create policy profiles_update_admin_only
on public.profiles
for update
using (
  public.user_has_any_role(array['admin', 'superadmin']::public.app_role[])
)
with check (
  public.user_has_any_role(array['admin', 'superadmin']::public.app_role[])
);

drop view if exists public.admin_user_overview;

create view public.admin_user_overview
with (security_invoker = true)
as
select
  p.id as user_id,
  p.email,
  p.full_name,
  p.can_reserve,
  coalesce(
    array(
      select ur.role::text
      from public.user_roles ur
      where ur.user_id = p.id
      order by ur.role::text
    ),
    array['user']
  ) as roles,
  coalesce(uam.total_reserved, 0) as total_reserved,
  coalesce(uam.total_scanned, 0) as total_scanned,
  coalesce(uam.no_show_ratio, 0) as no_show_ratio,
  coalesce(uam.abuse_score, 0) as abuse_score,
  uam.active_block_type,
  uam.active_block_until
from public.profiles p
left join public.user_abuse_metrics uam on uam.user_id = p.id;

create or replace function public.hold_seats(
  p_match_id uuid,
  p_seat_ids uuid[],
  p_gate_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_hold_token uuid := gen_random_uuid();
  v_requested_count integer := coalesce(array_length(p_seat_ids, 1), 0);
  v_existing_count integer := 0;
  v_max_tickets integer := 4;
  v_hold_minutes integer := 10;
  v_is_privileged boolean := public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]);
  v_is_blocked boolean := false;
  v_can_reserve boolean := false;
  v_expires_at timestamptz;
  v_invalid_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'Autentificare necesara pentru emiterea biletelor.';
  end if;

  if v_requested_count = 0 then
    raise exception 'Selecteaza cel putin un loc.';
  end if;

  perform public.cleanup_expired_holds(p_match_id);

  select
    coalesce(ms.max_tickets_per_user, 4),
    coalesce(ms.hold_minutes, 10)
  into v_max_tickets, v_hold_minutes
  from public.matches m
  left join public.match_settings ms on ms.match_id = m.id
  where m.id = p_match_id
    and m.status in ('published', 'closed');

  if not found then
    raise exception 'Meciul nu este disponibil pentru emitere.';
  end if;

  if exists (
    select 1
    from public.match_settings ms
    where ms.match_id = p_match_id
      and ms.opens_at is not null
      and now() < ms.opens_at
  ) then
    raise exception 'Solicitarea biletelor nu a fost deschisa inca.';
  end if;

  if exists (
    select 1
    from public.match_settings ms
    where ms.match_id = p_match_id
      and ms.closes_at is not null
      and now() > ms.closes_at
  ) then
    raise exception 'Solicitarea biletelor pentru acest meci s-a incheiat.';
  end if;

  select exists (
    select 1
    from public.user_blocks b
    where b.user_id = v_user_id
      and b.is_active = true
      and (b.ends_at is null or b.ends_at > now())
      and b.type in ('block', 'temp_ban')
  )
  into v_is_blocked;

  if v_is_blocked then
    raise exception 'Contul are o restrictie activa.';
  end if;

  select coalesce(p.can_reserve, false)
  into v_can_reserve
  from public.profiles p
  where p.id = v_user_id;

  if not v_is_privileged and not v_can_reserve then
    raise exception 'Contul nu are acces la solicitarea biletelor pentru acest meci.';
  end if;

  if not v_is_privileged then
    select count(*)
    into v_existing_count
    from public.tickets
    where user_id = v_user_id
      and match_id = p_match_id
      and status in ('active', 'used', 'blocked');

    if v_existing_count + v_requested_count > v_max_tickets then
      raise exception 'Ai depasit limita de bilete pentru acest meci.';
    end if;
  end if;

  select count(*)
  into v_invalid_count
  from unnest(p_seat_ids) as picked(seat_id)
  left join public.seats seat on seat.id = picked.seat_id
  left join public.stadium_sectors sector on sector.id = seat.sector_id
  left join public.matches m on m.id = p_match_id
  left join public.match_sector_overrides override
    on override.match_id = p_match_id
   and override.sector_id = sector.id
  where seat.id is null
     or sector.stadium_id <> m.stadium_id
     or (
       not v_is_privileged
       and (
         seat.is_disabled
         or seat.is_obstructed
         or seat.is_internal_only
         or coalesce(override.is_enabled, true) = false
       )
     );

  if v_invalid_count > 0 then
    raise exception 'Unele locuri nu pot fi solicitate.';
  end if;

  select count(*)
  into v_invalid_count
  from unnest(p_seat_ids) as picked(seat_id)
  where exists (
    select 1
    from public.seat_holds hold
    where hold.match_id = p_match_id
      and hold.seat_id = picked.seat_id
      and hold.status = 'active'
      and hold.expires_at > now()
      and hold.user_id <> v_user_id
  )
  or exists (
    select 1
    from public.tickets t
    where t.match_id = p_match_id
      and t.seat_id = picked.seat_id
      and t.status in ('active', 'used', 'blocked')
  );

  if v_invalid_count > 0 then
    raise exception 'Unele locuri nu mai sunt disponibile.';
  end if;

  delete from public.seat_holds
  where match_id = p_match_id
    and user_id = v_user_id
    and status = 'active';

  v_expires_at := now() + make_interval(mins => v_hold_minutes);

  insert into public.seat_holds (
    match_id,
    seat_id,
    user_id,
    hold_token,
    gate_id,
    status,
    expires_at
  )
  select
    p_match_id,
    picked.seat_id,
    v_user_id,
    v_hold_token,
    p_gate_id,
    'active',
    v_expires_at
  from unnest(p_seat_ids) as picked(seat_id);

  return jsonb_build_object(
    'message', 'Locurile au fost blocate temporar pentru emitere.',
    'hold_token', v_hold_token,
    'expires_at', v_expires_at
  );
end;
$$;

create or replace function public.confirm_hold_reservation(
  p_match_id uuid,
  p_hold_token uuid,
  p_source public.reservation_source default 'public_reservation'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_reservation_id uuid;
  v_hold_count integer := 0;
  v_is_privileged boolean := public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]);
  v_can_reserve boolean := false;
begin
  if v_user_id is null then
    raise exception 'Autentificare necesara.';
  end if;

  select coalesce(p.can_reserve, false)
  into v_can_reserve
  from public.profiles p
  where p.id = v_user_id;

  if not v_is_privileged and not v_can_reserve then
    raise exception 'Contul nu are acces la solicitarea biletelor pentru acest meci.';
  end if;

  perform public.cleanup_expired_holds(p_match_id);

  select count(*)
  into v_hold_count
  from public.seat_holds
  where match_id = p_match_id
    and user_id = v_user_id
    and hold_token = p_hold_token
    and status = 'active'
    and expires_at > now();

  if v_hold_count = 0 then
    raise exception 'Hold-ul nu mai este activ.';
  end if;

  insert into public.reservations (
    match_id,
    user_id,
    status,
    source,
    total_tickets,
    reserved_at,
    confirmed_at,
    hold_token,
    created_by
  )
  values (
    p_match_id,
    v_user_id,
    'confirmed',
    p_source,
    v_hold_count,
    now(),
    now(),
    p_hold_token,
    v_user_id
  )
  returning id into v_reservation_id;

  insert into public.reservation_items (
    reservation_id,
    match_id,
    seat_id,
    gate_id,
    status
  )
  select
    v_reservation_id,
    p_match_id,
    hold.seat_id,
    hold.gate_id,
    'confirmed'
  from public.seat_holds hold
  where hold.match_id = p_match_id
    and hold.user_id = v_user_id
    and hold.hold_token = p_hold_token
    and hold.status = 'active'
    and hold.expires_at > now();

  insert into public.tickets (
    reservation_item_id,
    reservation_id,
    match_id,
    seat_id,
    user_id,
    gate_id,
    ticket_code,
    qr_token_version,
    status,
    source,
    issued_at,
    created_by
  )
  select
    item.id,
    v_reservation_id,
    item.match_id,
    item.seat_id,
    v_user_id,
    item.gate_id,
    public.generate_ticket_code(),
    1,
    'active',
    p_source,
    now(),
    v_user_id
  from public.reservation_items item
  where item.reservation_id = v_reservation_id;

  update public.seat_holds
  set status = 'confirmed',
      released_at = now()
  where match_id = p_match_id
    and user_id = v_user_id
    and hold_token = p_hold_token
    and status = 'active';

  perform public.sync_abuse_flags_for_user(v_user_id);

  return jsonb_build_object(
    'message', 'Biletele au fost emise cu succes.',
    'reservation_id', v_reservation_id
  );
end;
$$;
