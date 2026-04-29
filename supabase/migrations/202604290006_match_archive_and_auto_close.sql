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
  v_existing_hold_status text := 'active';
  v_existing_hold_type text := 'initial';
  v_ticketing_mode text := 'free';
  v_max_tickets integer := 4;
  v_initial_hold_seconds integer := 90;
  v_allow_guest_hold boolean := true;
  v_require_login_before_hold boolean := false;
  v_match_starts_at timestamptz;
  v_match_closes_at timestamptz;
  v_expires_at timestamptz;
  v_owner_hold_count integer := 0;
  v_seat_row record;
begin
  perform public.cleanup_expired_holds(p_match_id);

  select
    m.starts_at,
    ms.closes_at,
    coalesce(ms.ticketing_mode, 'free'),
    coalesce(ms.max_tickets_per_user, 4),
    coalesce(ms.initial_hold_seconds, 90),
    coalesce(ms.allow_guest_hold, true),
    coalesce(ms.require_login_before_hold, false)
  into
    v_match_starts_at,
    v_match_closes_at,
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

  if v_match_closes_at is not null and now() > v_match_closes_at then
    raise exception 'Rezervarile pentru acest eveniment s-au inchis.';
  end if;

  if now() > v_match_starts_at + interval '60 minutes' then
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
      user_id = v_user_id
      or session_id = v_session_id
    )
  order by updated_at desc, created_at desc
  limit 1;

  if v_existing_hold_token is not null then
    return public.get_active_hold_summary(p_match_id, v_session_id);
  end if;

  if exists (
    select 1
    from public.seat_holds hold
    where hold.match_id = p_match_id
      and hold.seat_id = p_seat_id
      and hold.status in ('active', 'confirmed')
      and hold.expires_at > now()
      and not (
        hold.user_id = v_user_id
        or (hold.session_id = v_session_id)
      )
  ) then
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

  v_hold_token := coalesce(v_hold_token, gen_random_uuid());
  if v_existing_hold_expires_at is not null then
    v_expires_at := v_existing_hold_expires_at;
  else
    v_expires_at := now() + make_interval(secs => v_initial_hold_seconds);
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

create or replace function public.extend_seat_hold(
  p_match_id uuid,
  p_hold_token uuid,
  p_session_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_id text := nullif(trim(coalesce(p_session_id, '')), '');
  v_match_starts_at timestamptz;
  v_match_closes_at timestamptz;
  v_match_status public.match_status;
  v_ticketing_mode text := 'free';
  v_expires_at timestamptz;
  v_hold_type text := 'confirmed_free';
  v_extend_seconds integer := 300;
  v_count integer := 0;
begin
  perform public.cleanup_expired_holds(p_match_id);

  select
    m.status,
    m.starts_at,
    ms.closes_at,
    coalesce(ms.ticketing_mode, 'free'),
    case
      when coalesce(ms.ticketing_mode, 'free') = 'paid'
        then coalesce(ms.paid_ticket_confirmed_hold_seconds, 600)
      else coalesce(ms.free_ticket_confirmed_hold_seconds, 300)
    end
  into
    v_match_status,
    v_match_starts_at,
    v_match_closes_at,
    v_ticketing_mode,
    v_extend_seconds
  from public.matches m
  left join public.match_settings ms on ms.match_id = m.id
  where m.id = p_match_id;

  if not found or v_match_status = 'archived' then
    raise exception 'Evenimentul nu mai permite rezervari.';
  end if;

  if v_match_closes_at is not null and now() > v_match_closes_at then
    raise exception 'Rezervarile pentru acest eveniment s-au inchis.';
  end if;

  if now() > v_match_starts_at + interval '60 minutes' then
    raise exception 'Rezervarile pentru acest eveniment s-au inchis.';
  end if;

  if v_ticketing_mode = 'paid' then
    v_hold_type := 'confirmed_paid';
  end if;

  v_expires_at := now() + make_interval(secs => v_extend_seconds);

  update public.seat_holds
  set status = 'confirmed',
      hold_type = v_hold_type,
      expires_at = v_expires_at,
      updated_at = now()
  where match_id = p_match_id
    and hold_token = p_hold_token
    and status in ('active', 'confirmed')
    and expires_at > now()
    and (
      user_id = v_user_id
      or session_id = v_session_id
    );

  get diagnostics v_count = row_count;

  if v_count = 0 then
    raise exception 'Unele locuri nu mai sunt disponibile. Te rugam sa actualizezi selectia.';
  end if;

  return public.get_active_hold_summary(p_match_id, v_session_id);
end;
$$;

create or replace function public.confirm_hold_reservation(
  p_match_id uuid,
  p_hold_token uuid,
  p_source public.reservation_source default 'public_reservation',
  p_session_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_id text := nullif(trim(coalesce(p_session_id, '')), '');
  v_reservation_id uuid;
  v_hold_count integer := 0;
  v_is_privileged boolean := public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]);
  v_can_reserve boolean := false;
  v_ticketing_mode text := 'free';
  v_currency text := 'MDL';
  v_match_status public.match_status;
  v_match_starts_at timestamptz;
  v_match_closes_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Autentificare necesara.';
  end if;

  select coalesce(p.can_reserve, false)
  into v_can_reserve
  from public.profiles p
  where p.id = v_user_id;

  select
    m.status,
    m.starts_at,
    ms.closes_at,
    coalesce(ms.ticketing_mode, 'free'),
    coalesce(ms.currency, 'MDL')
  into
    v_match_status,
    v_match_starts_at,
    v_match_closes_at,
    v_ticketing_mode,
    v_currency
  from public.matches m
  left join public.match_settings ms on ms.match_id = m.id
  where m.id = p_match_id;

  if not found or v_match_status = 'archived' then
    raise exception 'Evenimentul nu mai permite rezervari.';
  end if;

  if v_match_closes_at is not null and now() > v_match_closes_at then
    raise exception 'Rezervarile pentru acest eveniment s-au inchis.';
  end if;

  if now() > v_match_starts_at + interval '60 minutes' then
    raise exception 'Rezervarile pentru acest eveniment s-au inchis.';
  end if;

  if not v_is_privileged and v_ticketing_mode = 'free' and not v_can_reserve then
    raise exception 'Contul nu are acces la solicitarea biletelor gratuite pentru acest meci.';
  end if;

  perform public.cleanup_expired_holds(p_match_id);

  select count(*)
  into v_hold_count
  from public.seat_holds
  where match_id = p_match_id
    and hold_token = p_hold_token
    and status in ('active', 'confirmed')
    and expires_at > now()
    and (
      user_id = v_user_id
      or session_id = v_session_id
    );

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
    status,
    unit_price_cents,
    currency
  )
  select
    v_reservation_id,
    p_match_id,
    hold.seat_id,
    hold.gate_id,
    'confirmed',
    0,
    v_currency
  from public.seat_holds hold
  where hold.match_id = p_match_id
    and hold.hold_token = p_hold_token
    and hold.status in ('active', 'confirmed')
    and hold.expires_at > now()
    and (
      hold.user_id = v_user_id
      or hold.session_id = v_session_id
    );

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
  set status = 'converted',
      user_id = v_user_id,
      session_id = v_session_id,
      released_at = now(),
      updated_at = now()
  where match_id = p_match_id
    and hold_token = p_hold_token
    and status in ('active', 'confirmed')
    and (
      user_id = v_user_id
      or session_id = v_session_id
    );

  perform public.sync_abuse_flags_for_user(v_user_id);

  return jsonb_build_object(
    'message', 'Biletele au fost emise cu succes.',
    'reservation_id', v_reservation_id
  );
end;
$$;

create or replace function public.complete_demo_payment(
  p_match_id uuid,
  p_hold_token uuid,
  p_session_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_id text := nullif(trim(coalesce(p_session_id, '')), '');
  v_reservation_id uuid;
  v_payment_id uuid;
  v_hold_count integer := 0;
  v_currency text := 'MDL';
  v_total_amount integer := 0;
  v_ticketing_mode text := 'free';
  v_match_status public.match_status;
  v_match_starts_at timestamptz;
  v_match_closes_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Autentificare necesara.';
  end if;

  perform public.cleanup_expired_holds(p_match_id);

  select
    m.status,
    m.starts_at,
    ms.closes_at,
    coalesce(ms.ticketing_mode, 'free'),
    coalesce(ms.currency, 'MDL')
  into
    v_match_status,
    v_match_starts_at,
    v_match_closes_at,
    v_ticketing_mode,
    v_currency
  from public.matches m
  left join public.match_settings ms on ms.match_id = m.id
  where m.id = p_match_id;

  if not found or v_match_status = 'archived' then
    raise exception 'Evenimentul nu mai permite rezervari.';
  end if;

  if v_match_closes_at is not null and now() > v_match_closes_at then
    raise exception 'Rezervarile pentru acest eveniment s-au inchis.';
  end if;

  if now() > v_match_starts_at + interval '60 minutes' then
    raise exception 'Rezervarile pentru acest eveniment s-au inchis.';
  end if;

  select count(*)
  into v_hold_count
  from public.seat_holds
  where match_id = p_match_id
    and hold_token = p_hold_token
    and status in ('active', 'confirmed')
    and expires_at > now()
    and (
      user_id = v_user_id
      or session_id = v_session_id
    );

  if v_hold_count = 0 then
    raise exception 'Hold-ul nu mai este activ.';
  end if;

  if v_ticketing_mode <> 'paid' then
    raise exception 'Acest eveniment nu este configurat pentru procurare cu plata.';
  end if;

  select coalesce(sum(
    coalesce(sector_override.ticket_price_cents_override, match_settings.ticket_price_cents, 0)
  ), 0)
  into v_total_amount
  from public.seat_holds hold
  join public.seats seat on seat.id = hold.seat_id
  join public.stadium_sectors sector on sector.id = seat.sector_id
  left join public.match_settings match_settings on match_settings.match_id = hold.match_id
  left join public.match_sector_overrides sector_override
    on sector_override.match_id = hold.match_id
   and sector_override.sector_id = sector.id
  where hold.match_id = p_match_id
    and hold.hold_token = p_hold_token
    and hold.status in ('active', 'confirmed')
    and hold.expires_at > now()
    and (
      hold.user_id = v_user_id
      or hold.session_id = v_session_id
    );

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
    'paid_purchase',
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
    status,
    unit_price_cents,
    currency
  )
  select
    v_reservation_id,
    p_match_id,
    hold.seat_id,
    hold.gate_id,
    'confirmed',
    coalesce(sector_override.ticket_price_cents_override, match_settings.ticket_price_cents, 0),
    coalesce(match_settings.currency, 'MDL')
  from public.seat_holds hold
  join public.seats seat on seat.id = hold.seat_id
  join public.stadium_sectors sector on sector.id = seat.sector_id
  left join public.match_settings match_settings on match_settings.match_id = hold.match_id
  left join public.match_sector_overrides sector_override
    on sector_override.match_id = hold.match_id
   and sector_override.sector_id = sector.id
  where hold.match_id = p_match_id
    and hold.hold_token = p_hold_token
    and hold.status in ('active', 'confirmed')
    and hold.expires_at > now()
    and (
      hold.user_id = v_user_id
      or hold.session_id = v_session_id
    );

  insert into public.payments (
    reservation_id,
    match_id,
    user_id,
    amount_cents,
    currency,
    status,
    provider,
    payment_reference,
    paid_at,
    metadata
  )
  values (
    v_reservation_id,
    p_match_id,
    v_user_id,
    v_total_amount,
    v_currency,
    'paid',
    'demo',
    'DEMO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    now(),
    jsonb_build_object('hold_token', p_hold_token, 'tickets', v_hold_count)
  )
  returning id into v_payment_id;

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
    'paid_purchase',
    now(),
    v_user_id
  from public.reservation_items item
  where item.reservation_id = v_reservation_id;

  update public.seat_holds
  set status = 'converted',
      user_id = v_user_id,
      session_id = v_session_id,
      released_at = now(),
      updated_at = now()
  where match_id = p_match_id
    and hold_token = p_hold_token
    and status in ('active', 'confirmed')
    and (
      user_id = v_user_id
      or session_id = v_session_id
    );

  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action, details)
  values (
    v_user_id,
    'payments',
    v_payment_id::text,
    'complete_demo_payment',
    jsonb_build_object(
      'reservation_id', v_reservation_id,
      'match_id', p_match_id,
      'amount_cents', v_total_amount,
      'currency', v_currency
    )
  );

  return jsonb_build_object(
    'message', 'Plata demo a fost confirmata si biletele au fost emise.',
    'reservation_id', v_reservation_id,
    'payment_id', v_payment_id,
    'amount_cents', v_total_amount,
    'currency', v_currency
  );
end;
$$;

drop view if exists public.public_match_cards;
create or replace view public.public_match_cards
with (security_invoker = true)
as
select
  m.id,
  m.stadium_id,
  m.slug,
  m.title,
  m.competition_name,
  m.opponent_name,
  s.name as stadium_name,
  s.city,
  m.description,
  m.poster_url,
  m.banner_url,
  m.starts_at,
  m.status,
  coalesce(ms.max_tickets_per_user, 4) as max_tickets_per_user,
  ms.opens_at as reservation_opens_at,
  ms.closes_at as reservation_closes_at,
  coalesce(ms.initial_hold_seconds, 90) as initial_hold_seconds,
  coalesce(ms.free_ticket_confirmed_hold_seconds, 300) as free_ticket_confirmed_hold_seconds,
  coalesce(ms.paid_ticket_confirmed_hold_seconds, 600) as paid_ticket_confirmed_hold_seconds,
  coalesce(ms.allow_guest_hold, true) as allow_guest_hold,
  coalesce(ms.require_login_before_hold, false) as require_login_before_hold,
  coalesce(tus.issued_count, 0) as issued_count,
  coalesce(tus.scanned_count, 0) as scanned_count,
  coalesce(availability.available_count, 0)::integer as available_estimate,
  m.scanner_enabled,
  coalesce(ms.ticketing_mode, 'free') as ticketing_mode,
  coalesce(ms.ticket_price_cents, 0) as ticket_price_cents,
  coalesce(ms.currency, 'MDL') as currency
from public.matches m
join public.stadiums s on s.id = m.stadium_id
left join public.match_settings ms on ms.match_id = m.id
left join public.ticket_usage_summary tus on tus.match_id = m.id
left join lateral (
  select count(*) as available_count
  from public.get_match_seat_status(m.id, null) seat_status
  where seat_status.availability_state = 'available'
) availability on true
where m.status in ('published', 'closed', 'completed');

drop view if exists public.match_admin_overview;
create or replace view public.match_admin_overview
with (security_invoker = true)
as
select
  m.id,
  m.stadium_id,
  m.slug,
  m.title,
  m.competition_name,
  m.opponent_name,
  s.name as stadium_name,
  m.poster_url,
  m.banner_url,
  m.starts_at,
  m.status,
  m.archived_at,
  m.scanner_enabled,
  coalesce(ms.max_tickets_per_user, 4) as max_tickets_per_user,
  ms.opens_at as reservation_opens_at,
  ms.closes_at as reservation_closes_at,
  coalesce(ms.initial_hold_seconds, 90) as initial_hold_seconds,
  coalesce(ms.free_ticket_confirmed_hold_seconds, 300) as free_ticket_confirmed_hold_seconds,
  coalesce(ms.paid_ticket_confirmed_hold_seconds, 600) as paid_ticket_confirmed_hold_seconds,
  coalesce(ms.allow_guest_hold, true) as allow_guest_hold,
  coalesce(ms.require_login_before_hold, false) as require_login_before_hold,
  coalesce(tus.issued_count, 0) as issued_count,
  coalesce(tus.scanned_count, 0) as scanned_count,
  coalesce(tus.no_show_count, 0) as no_show_count,
  coalesce(tus.duplicate_scan_attempts, 0) as duplicate_scan_attempts,
  coalesce(ms.ticketing_mode, 'free') as ticketing_mode,
  coalesce(ms.ticket_price_cents, 0) as ticket_price_cents,
  coalesce(ms.currency, 'MDL') as currency
from public.matches m
join public.stadiums s on s.id = m.stadium_id
left join public.match_settings ms on ms.match_id = m.id
left join public.ticket_usage_summary tus on tus.match_id = m.id;
