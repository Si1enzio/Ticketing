alter table public.match_settings
add column if not exists ticketing_mode text not null default 'free';

alter table public.match_settings
add column if not exists ticket_price_cents integer not null default 0;

alter table public.match_settings
add column if not exists currency text not null default 'MDL';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'match_settings_ticketing_mode_check'
  ) then
    alter table public.match_settings
      add constraint match_settings_ticketing_mode_check
      check (ticketing_mode in ('free', 'paid'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'match_settings_ticket_price_cents_check'
  ) then
    alter table public.match_settings
      add constraint match_settings_ticket_price_cents_check
      check (ticket_price_cents >= 0);
  end if;
end $$;

do $$
begin
  alter type public.reservation_source add value if not exists 'paid_purchase';
exception
  when duplicate_object then null;
end $$;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid references public.reservations(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_cents integer not null default 0 check (amount_cents >= 0),
  currency text not null default 'MDL',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'canceled')),
  provider text not null default 'demo',
  payment_reference text,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_match_status_idx
  on public.payments (match_id, status, created_at desc);

create index if not exists payments_user_status_idx
  on public.payments (user_id, status, created_at desc);

drop trigger if exists payments_touch_updated_at on public.payments;
create trigger payments_touch_updated_at
before update on public.payments
for each row execute function public.touch_updated_at();

alter table public.payments enable row level security;

drop policy if exists payments_select_own_or_admin on public.payments;
create policy payments_select_own_or_admin
on public.payments
for select
using (
  auth.uid() = user_id
  or public.user_has_any_role(array['admin', 'superadmin']::public.app_role[])
);

drop view if exists public.public_match_cards;
drop view if exists public.match_admin_overview;

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
  greatest(
    (
      select count(*)
      from public.seats seat
      join public.stadium_sectors sector on sector.id = seat.sector_id
      where sector.stadium_id = m.stadium_id
        and seat.is_disabled = false
        and seat.is_obstructed = false
        and seat.is_internal_only = false
    )
    - coalesce(tus.issued_count, 0)
    - (
      select count(*)
      from public.seat_holds hold
      where hold.match_id = m.id
        and hold.status = 'active'
        and hold.expires_at > now()
    ),
    0
  )::integer as available_estimate,
  m.scanner_enabled,
  coalesce(ms.ticketing_mode, 'free') as ticketing_mode,
  coalesce(ms.ticket_price_cents, 0) as ticket_price_cents,
  coalesce(ms.currency, 'MDL') as currency
from public.matches m
join public.stadiums s on s.id = m.stadium_id
left join public.match_settings ms on ms.match_id = m.id
left join public.ticket_usage_summary tus on tus.match_id = m.id
where m.status in ('published', 'closed', 'completed');

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
  m.starts_at,
  m.status,
  m.scanner_enabled,
  coalesce(ms.max_tickets_per_user, 4) as max_tickets_per_user,
  ms.opens_at as reservation_opens_at,
  ms.closes_at as reservation_closes_at,
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

update public.match_settings
set
  ticketing_mode = 'free',
  ticket_price_cents = 0,
  currency = 'MDL'
where match_id in (
  select id
  from public.matches
  where slug in (
    'milsami-orhei-fc-zimbru-chisinau',
    'milsami-orhei-fc-balti'
  )
);

update public.match_settings
set
  ticketing_mode = 'paid',
  ticket_price_cents = 15000,
  currency = 'MDL'
where match_id = (
  select id
  from public.matches
  where slug = 'milsami-orhei-sheriff-tiraspol'
  limit 1
);

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
  v_ticketing_mode text := 'free';
  v_is_privileged boolean := public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]);
  v_is_blocked boolean := false;
  v_can_reserve boolean := false;
  v_expires_at timestamptz;
  v_invalid_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'Autentificare necesara pentru ticketing.';
  end if;

  if v_requested_count = 0 then
    raise exception 'Selecteaza cel putin un loc.';
  end if;

  perform public.cleanup_expired_holds(p_match_id);

  select
    coalesce(ms.max_tickets_per_user, 4),
    coalesce(ms.hold_minutes, 10),
    coalesce(ms.ticketing_mode, 'free')
  into v_max_tickets, v_hold_minutes, v_ticketing_mode
  from public.matches m
  left join public.match_settings ms on ms.match_id = m.id
  where m.id = p_match_id
    and m.status in ('published', 'closed');

  if not found then
    raise exception 'Meciul nu este disponibil pentru ticketing.';
  end if;

  if exists (
    select 1
    from public.match_settings ms
    where ms.match_id = p_match_id
      and ms.opens_at is not null
      and now() < ms.opens_at
  ) then
    raise exception 'Ticketing-ul nu a fost deschis inca.';
  end if;

  if exists (
    select 1
    from public.match_settings ms
    where ms.match_id = p_match_id
      and ms.closes_at is not null
      and now() > ms.closes_at
  ) then
    raise exception 'Ticketing-ul pentru acest meci s-a incheiat.';
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

  if not v_is_privileged and v_ticketing_mode = 'free' and not v_can_reserve then
    raise exception 'Contul nu are acces la solicitarea biletelor gratuite pentru acest meci.';
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
    raise exception 'Unele locuri nu pot fi alocate.';
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
    'message', 'Locurile au fost blocate temporar.',
    'hold_token', v_hold_token,
    'expires_at', v_expires_at,
    'ticketing_mode', v_ticketing_mode
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
  v_ticketing_mode text := 'free';
begin
  if v_user_id is null then
    raise exception 'Autentificare necesara.';
  end if;

  select coalesce(p.can_reserve, false)
  into v_can_reserve
  from public.profiles p
  where p.id = v_user_id;

  select coalesce(ms.ticketing_mode, 'free')
  into v_ticketing_mode
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
  v_ticket_price_cents integer := 0;
  v_currency text := 'MDL';
  v_total_amount integer := 0;
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
    coalesce(ms.ticket_price_cents, 0),
    coalesce(ms.currency, 'MDL')
  into v_ticket_price_cents, v_currency
  from public.match_settings ms
  where ms.match_id = p_match_id
    and ms.ticketing_mode = 'paid';

  if not found or v_ticket_price_cents <= 0 then
    raise exception 'Acest meci nu este configurat pentru procurare cu plata.';
  end if;

  v_total_amount := v_ticket_price_cents * v_hold_count;

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
