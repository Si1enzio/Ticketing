alter table public.match_sector_overrides
add column if not exists ticket_price_cents_override integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'match_sector_overrides_ticket_price_cents_override_check'
  ) then
    alter table public.match_sector_overrides
      add constraint match_sector_overrides_ticket_price_cents_override_check
      check (
        ticket_price_cents_override is null
        or ticket_price_cents_override >= 0
      );
  end if;
end $$;

alter table public.reservation_items
add column if not exists unit_price_cents integer not null default 0;

alter table public.reservation_items
add column if not exists currency text not null default 'MDL';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservation_items_unit_price_cents_check'
  ) then
    alter table public.reservation_items
      add constraint reservation_items_unit_price_cents_check
      check (unit_price_cents >= 0);
  end if;
end $$;

drop view if exists public.public_match_cards;
drop function if exists public.get_match_seat_status(uuid);

create or replace function public.get_match_seat_status(p_match_id uuid)
returns table (
  match_id uuid,
  sector_id uuid,
  sector_code text,
  sector_name text,
  sector_color text,
  sector_sort_order integer,
  seat_id uuid,
  row_label text,
  seat_number integer,
  seat_label text,
  availability_state text,
  hold_expires_at timestamptz,
  held_by_current_user boolean,
  gate_name text,
  effective_ticket_price_cents integer,
  currency text,
  row_sort_order bigint
)
language sql
security definer
set search_path = public
as $$
  with active_seat_override as (
    select distinct on (seat_id)
      match_id,
      seat_id,
      status,
      expires_at
    from public.match_seat_overrides
    where status = 'blocked'
       or (status = 'admin_hold' and (expires_at is null or expires_at > now()))
    order by seat_id, created_at desc
  )
  select
    m.id as match_id,
    sector.id as sector_id,
    sector.code as sector_code,
    sector.name as sector_name,
    sector.color as sector_color,
    sector.sort_order as sector_sort_order,
    seat.id as seat_id,
    seat.row_label,
    seat.seat_number,
    seat.seat_label,
    case
      when coalesce(sector_override.is_enabled, true) = false then 'blocked'
      when active_override.status = 'blocked' then 'blocked'
      when active_override.status = 'admin_hold' then 'held'
      when seat.is_disabled then 'disabled'
      when seat.is_obstructed then 'obstructed'
      when seat.is_internal_only then 'internal'
      when exists (
        select 1
        from public.tickets t
        where t.match_id = m.id
          and t.seat_id = seat.id
          and t.status in ('active', 'used', 'blocked')
      ) then 'reserved'
      when exists (
        select 1
        from public.seat_holds hold
        where hold.match_id = m.id
          and hold.seat_id = seat.id
          and hold.status = 'active'
          and hold.expires_at > now()
      ) then 'held'
      else 'available'
    end as availability_state,
    coalesce(
      active_override.expires_at,
      (
        select max(hold.expires_at)
        from public.seat_holds hold
        where hold.match_id = m.id
          and hold.seat_id = seat.id
          and hold.status = 'active'
          and hold.expires_at > now()
      )
    ) as hold_expires_at,
    exists (
      select 1
      from public.seat_holds hold
      where hold.match_id = m.id
        and hold.seat_id = seat.id
        and hold.status = 'active'
        and hold.expires_at > now()
        and hold.user_id = auth.uid()
    ) as held_by_current_user,
    gate.name as gate_name,
    case
      when coalesce(match_settings.ticketing_mode, 'free') = 'paid'
      then coalesce(sector_override.ticket_price_cents_override, match_settings.ticket_price_cents, 0)
      else 0
    end as effective_ticket_price_cents,
    coalesce(match_settings.currency, 'MDL') as currency,
    row_number() over (
      partition by m.id, sector.id
      order by seat.row_label::integer nulls last, seat.seat_number
    ) as row_sort_order
  from public.matches m
  join public.stadium_sectors sector on sector.stadium_id = m.stadium_id
  join public.seats seat on seat.sector_id = sector.id
  left join public.match_settings match_settings on match_settings.match_id = m.id
  left join public.match_sector_overrides sector_override
    on sector_override.match_id = m.id
   and sector_override.sector_id = sector.id
  left join active_seat_override active_override
    on active_override.match_id = m.id
   and active_override.seat_id = seat.id
  left join public.gates gate on gate.id = coalesce(seat.gate_id, sector.gate_id)
  where m.id = p_match_id;
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
  v_ticketing_mode text := 'free';
  v_currency text := 'MDL';
begin
  if v_user_id is null then
    raise exception 'Autentificare necesara.';
  end if;

  select coalesce(p.can_reserve, false)
  into v_can_reserve
  from public.profiles p
  where p.id = v_user_id;

  select
    coalesce(ms.ticketing_mode, 'free'),
    coalesce(ms.currency, 'MDL')
  into v_ticketing_mode, v_currency
  from public.match_settings ms
  where ms.match_id = p_match_id;

  if not v_is_privileged and v_ticketing_mode = 'free' and not v_can_reserve then
    raise exception 'Contul nu are acces la solicitarea biletelor gratuite pentru acest meci.';
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
  ms.max_tickets_per_user,
  ms.opens_at as reservation_opens_at,
  ms.closes_at as reservation_closes_at,
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
  from public.get_match_seat_status(m.id) seat_status
  where seat_status.availability_state = 'available'
) availability on true
where m.status in ('published', 'closed', 'completed');

create or replace function public.complete_demo_payment(
  p_match_id uuid,
  p_hold_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_reservation_id uuid;
  v_payment_id uuid;
  v_hold_count integer := 0;
  v_currency text := 'MDL';
  v_total_amount integer := 0;
  v_ticketing_mode text := 'free';
begin
  if v_user_id is null then
    raise exception 'Autentificare necesara.';
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

  select
    coalesce(ms.ticketing_mode, 'free'),
    coalesce(ms.currency, 'MDL')
  into v_ticketing_mode, v_currency
  from public.match_settings ms
  where ms.match_id = p_match_id;

  if v_ticketing_mode <> 'paid' then
    raise exception 'Acest meci nu este configurat pentru procurare cu plata.';
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
    and hold.user_id = v_user_id
    and hold.hold_token = p_hold_token
    and hold.status = 'active'
    and hold.expires_at > now();

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
    and hold.user_id = v_user_id
    and hold.hold_token = p_hold_token
    and hold.status = 'active'
    and hold.expires_at > now();

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
  set status = 'confirmed',
      released_at = now()
  where match_id = p_match_id
    and user_id = v_user_id
    and hold_token = p_hold_token
    and status = 'active';

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
