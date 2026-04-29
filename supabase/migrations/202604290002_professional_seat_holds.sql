alter table public.match_settings
  add column if not exists initial_hold_seconds integer not null default 90,
  add column if not exists free_ticket_confirmed_hold_seconds integer not null default 300,
  add column if not exists paid_ticket_confirmed_hold_seconds integer not null default 600,
  add column if not exists allow_guest_hold boolean not null default true,
  add column if not exists require_login_before_hold boolean not null default false;

drop view if exists public.public_match_cards;
drop view if exists public.match_admin_overview;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'match_settings_initial_hold_seconds_check'
  ) then
    alter table public.match_settings
      add constraint match_settings_initial_hold_seconds_check
      check (initial_hold_seconds between 60 and 120);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'match_settings_free_ticket_confirmed_hold_seconds_check'
  ) then
    alter table public.match_settings
      add constraint match_settings_free_ticket_confirmed_hold_seconds_check
      check (free_ticket_confirmed_hold_seconds between 180 and 300);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'match_settings_paid_ticket_confirmed_hold_seconds_check'
  ) then
    alter table public.match_settings
      add constraint match_settings_paid_ticket_confirmed_hold_seconds_check
      check (paid_ticket_confirmed_hold_seconds between 420 and 600);
  end if;
end $$;

alter table public.seat_holds
  alter column user_id drop not null;

alter table public.seat_holds
  add column if not exists session_id text,
  add column if not exists hold_type text not null default 'initial',
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'seat_holds_owner_presence_check'
  ) then
    alter table public.seat_holds
      add constraint seat_holds_owner_presence_check
      check (user_id is not null or nullif(trim(coalesce(session_id, '')), '') is not null);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'seat_holds_hold_type_check'
  ) then
    alter table public.seat_holds
      add constraint seat_holds_hold_type_check
      check (hold_type in ('initial', 'confirmed_free', 'confirmed_paid'));
  end if;
end $$;

drop index if exists public.seat_holds_active_match_seat_uidx;

create unique index if not exists seat_holds_active_match_seat_uidx
  on public.seat_holds (match_id, seat_id)
  where status in ('active', 'confirmed');

create index if not exists seat_holds_owner_lookup_idx
  on public.seat_holds (match_id, user_id, session_id, status, expires_at desc);

create index if not exists seat_holds_hold_token_idx
  on public.seat_holds (match_id, hold_token, status, expires_at desc);

create or replace function public.cleanup_expired_holds(p_match_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_rows integer;
begin
  update public.seat_holds
  set status = 'expired',
      released_at = now(),
      updated_at = now()
  where status in ('active', 'confirmed')
    and expires_at <= now()
    and (p_match_id is null or match_id = p_match_id);

  get diagnostics updated_rows = row_count;
  return updated_rows;
end;
$$;

drop function if exists public.get_match_seat_status(uuid);
drop function if exists public.get_match_seat_status(uuid, text);

create or replace function public.get_match_seat_status(
  p_match_id uuid,
  p_session_id text default null
)
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
  with hold_owner as (
    select auth.uid() as user_id, nullif(trim(coalesce(p_session_id, '')), '') as session_id
  ),
  active_seat_override as (
    select distinct on (seat_id)
      match_id,
      seat_id,
      status,
      expires_at
    from public.match_seat_overrides
    where status = 'blocked'
       or (status = 'admin_hold' and (expires_at is null or expires_at > now()))
    order by seat_id, created_at desc
  ),
  current_hold as (
    select distinct on (hold.match_id, hold.seat_id)
      hold.match_id,
      hold.seat_id,
      hold.user_id,
      hold.session_id,
      hold.status,
      hold.expires_at
    from public.seat_holds hold
    where hold.match_id = p_match_id
      and hold.status in ('active', 'confirmed')
      and hold.expires_at > now()
    order by hold.match_id, hold.seat_id, hold.updated_at desc, hold.created_at desc
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
      when coalesce(sector_override.is_enabled, true) = false then 'unavailable'
      when active_override.status = 'blocked' then 'unavailable'
      when seat.is_disabled then 'unavailable'
      when seat.is_obstructed then 'unavailable'
      when seat.is_internal_only then 'unavailable'
      when active_override.status = 'admin_hold' then 'unavailable'
      when exists (
        select 1
        from public.tickets t
        where t.match_id = m.id
          and t.seat_id = seat.id
          and t.status in ('active', 'used', 'blocked')
      ) then case
        when coalesce(match_settings.ticketing_mode, 'free') = 'paid' then 'sold'
        else 'reserved'
      end
      when current_hold.seat_id is not null
        and (
          current_hold.user_id = (select user_id from hold_owner)
          or (
            current_hold.user_id is null
            and current_hold.session_id is not distinct from (select session_id from hold_owner)
          )
        ) then 'held_by_me'
      when current_hold.seat_id is not null then 'held'
      else 'available'
    end as availability_state,
    current_hold.expires_at as hold_expires_at,
    (
      current_hold.seat_id is not null
      and (
        current_hold.user_id = (select user_id from hold_owner)
        or (
          current_hold.user_id is null
          and current_hold.session_id is not distinct from (select session_id from hold_owner)
        )
      )
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
  left join current_hold
    on current_hold.match_id = m.id
   and current_hold.seat_id = seat.id
  left join public.gates gate on gate.id = coalesce(seat.gate_id, sector.gate_id)
  where m.id = p_match_id;
$$;

create or replace function public.get_active_hold_summary(
  p_match_id uuid,
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
  v_hold_token uuid;
  v_expires_at timestamptz;
  v_hold_type text;
  v_seat_ids uuid[];
begin
  perform public.cleanup_expired_holds(p_match_id);

  if v_user_id is null and v_session_id is null then
    return null;
  end if;

  select hold_token, max(expires_at), min(hold_type)
  into v_hold_token, v_expires_at, v_hold_type
  from public.seat_holds
  where match_id = p_match_id
    and status in ('active', 'confirmed')
    and expires_at > now()
    and (
      user_id = v_user_id
      or (v_user_id is null and session_id = v_session_id)
      or (v_user_id is not null and session_id = v_session_id)
    )
  group by hold_token
  order by max(updated_at) desc, max(created_at) desc
  limit 1;

  if v_hold_token is null then
    return null;
  end if;

  select array_agg(seat_id order by created_at, seat_id)
  into v_seat_ids
  from public.seat_holds
  where match_id = p_match_id
    and hold_token = v_hold_token
    and status in ('active', 'confirmed')
    and expires_at > now()
    and (
      user_id = v_user_id
      or (session_id = v_session_id)
    );

  return jsonb_build_object(
    'hold_token', v_hold_token,
    'expires_at', v_expires_at,
    'hold_type', v_hold_type,
    'seat_ids', coalesce(v_seat_ids, array[]::uuid[])
  );
end;
$$;

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
  v_existing_hold_status text := 'active';
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
      user_id = v_user_id
      or (session_id = v_session_id)
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

drop function if exists public.release_seat_hold(uuid, uuid, uuid, text);
create or replace function public.release_seat_hold(
  p_match_id uuid,
  p_seat_id uuid,
  p_hold_token uuid default null,
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
begin
  perform public.cleanup_expired_holds(p_match_id);

  update public.seat_holds
  set status = 'released',
      released_at = now(),
      updated_at = now()
  where match_id = p_match_id
    and seat_id = p_seat_id
    and status in ('active', 'confirmed')
    and expires_at > now()
    and (p_hold_token is null or hold_token = p_hold_token)
    and (
      user_id = v_user_id
      or session_id = v_session_id
    );

  return public.get_active_hold_summary(p_match_id, v_session_id);
end;
$$;

drop function if exists public.extend_seat_hold(uuid, uuid, text);
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
  v_ticketing_mode text := 'free';
  v_expires_at timestamptz;
  v_hold_type text := 'confirmed_free';
  v_extend_seconds integer := 300;
  v_count integer := 0;
begin
  perform public.cleanup_expired_holds(p_match_id);

  select
    coalesce(ms.ticketing_mode, 'free'),
    case
      when coalesce(ms.ticketing_mode, 'free') = 'paid'
        then coalesce(ms.paid_ticket_confirmed_hold_seconds, 600)
      else coalesce(ms.free_ticket_confirmed_hold_seconds, 300)
    end
  into v_ticketing_mode, v_extend_seconds
  from public.match_settings ms
  where ms.match_id = p_match_id;

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

drop function if exists public.get_checkout_summary(uuid, uuid, text);
create or replace function public.get_checkout_summary(
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
  v_result jsonb;
begin
  perform public.cleanup_expired_holds(p_match_id);

  with hold_rows as (
    select
      hold.hold_token,
      hold.expires_at,
      hold.match_id,
      hold.hold_type,
      hold.created_at,
      seat.id as seat_id,
      seat.row_label,
      seat.seat_number,
      sector.id as sector_id,
      sector.name as sector_name,
      gate.name as gate_name,
      coalesce(sector_override.ticket_price_cents_override, ms.ticket_price_cents, 0) as price_cents,
      coalesce(ms.currency, 'MDL') as currency,
      m.slug as match_slug,
      m.title as match_title,
      m.starts_at,
      stadium.name as stadium_name,
      coalesce(ms.ticketing_mode, 'free') as ticketing_mode,
      coalesce(ms.ticket_price_cents, 0) as ticket_price_cents
    from public.seat_holds hold
    join public.matches m on m.id = hold.match_id
    join public.stadiums stadium on stadium.id = m.stadium_id
    left join public.match_settings ms on ms.match_id = m.id
    join public.seats seat on seat.id = hold.seat_id
    join public.stadium_sectors sector on sector.id = seat.sector_id
    left join public.gates gate on gate.id = coalesce(hold.gate_id, seat.gate_id, sector.gate_id)
    left join public.match_sector_overrides sector_override
      on sector_override.match_id = hold.match_id
     and sector_override.sector_id = sector.id
    where hold.match_id = p_match_id
      and hold.hold_token = p_hold_token
      and hold.status in ('active', 'confirmed')
      and hold.expires_at > now()
      and (
        hold.user_id = v_user_id
        or hold.session_id = nullif(trim(coalesce(p_session_id, '')), '')
      )
  )
  select jsonb_build_object(
    'holdToken', p_hold_token,
    'matchId', (array_agg(match_id order by created_at))[1],
    'matchSlug', (array_agg(match_slug order by created_at))[1],
    'matchTitle', (array_agg(match_title order by created_at))[1],
    'startsAt', (array_agg(starts_at order by created_at))[1],
    'stadiumName', (array_agg(stadium_name order by created_at))[1],
    'ticketingMode', (array_agg(ticketing_mode order by created_at))[1],
    'ticketPriceCents', (array_agg(ticket_price_cents order by created_at))[1],
    'currency', (array_agg(currency order by created_at))[1],
    'totalAmountCents', coalesce(sum(price_cents), 0),
    'expiresAt', max(expires_at),
    'holdType', (array_agg(hold_type order by created_at))[1],
    'items', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'seatId', seat_id,
          'sectorName', sector_name,
          'rowLabel', row_label,
          'seatNumber', seat_number,
          'gateName', gate_name,
          'priceCents', price_cents,
          'currency', currency
        )
        order by created_at, row_label, seat_number
      ),
      '[]'::jsonb
    )
  )
  into v_result
  from hold_rows;

  if v_result is null or jsonb_array_length(coalesce(v_result->'items', '[]'::jsonb)) = 0 then
    return null;
  end if;

  return v_result;
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
begin
  if v_user_id is null then
    raise exception 'Autentificare necesara.';
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

  select
    coalesce(ms.ticketing_mode, 'free'),
    coalesce(ms.currency, 'MDL')
  into v_ticketing_mode, v_currency
  from public.match_settings ms
  where ms.match_id = p_match_id;

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
