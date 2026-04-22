do $$
begin
  create type public.profile_gender as enum ('male', 'female', 'other', 'unspecified');
exception
  when duplicate_object then null;
end $$;

alter table public.profiles
add column if not exists contact_email text,
add column if not exists locality text,
add column if not exists district text,
add column if not exists birth_date date,
add column if not exists gender public.profile_gender not null default 'unspecified',
add column if not exists preferred_language text not null default 'ro',
add column if not exists marketing_opt_in boolean not null default false,
add column if not exists sms_opt_in boolean not null default false;

update public.profiles
set contact_email = coalesce(contact_email, email)
where contact_email is null
  and email is not null;

create or replace function public.update_profile_self(
  p_full_name text default null,
  p_phone text default null,
  p_contact_email text default null,
  p_locality text default null,
  p_district text default null,
  p_birth_date date default null,
  p_gender public.profile_gender default 'unspecified',
  p_preferred_language text default 'ro',
  p_marketing_opt_in boolean default false,
  p_sms_opt_in boolean default false
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_user_id is null then
    raise exception 'Autentificare necesara.';
  end if;

  update public.profiles
  set
    full_name = nullif(trim(coalesce(p_full_name, full_name)), ''),
    phone = nullif(trim(coalesce(p_phone, phone)), ''),
    contact_email = nullif(trim(coalesce(p_contact_email, contact_email)), ''),
    locality = nullif(trim(coalesce(p_locality, locality)), ''),
    district = nullif(trim(coalesce(p_district, district)), ''),
    birth_date = coalesce(p_birth_date, birth_date),
    gender = coalesce(p_gender, gender),
    preferred_language = coalesce(nullif(trim(p_preferred_language), ''), preferred_language, 'ro'),
    marketing_opt_in = coalesce(p_marketing_opt_in, marketing_opt_in),
    sms_opt_in = coalesce(p_sms_opt_in, sms_opt_in)
  where id = v_user_id
  returning * into v_profile;

  return v_profile;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, contact_email, full_name, preferred_language)
  values (
    new.id,
    new.email,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'preferred_language', 'ro')
  )
  on conflict (id) do update
  set email = excluded.email,
      contact_email = coalesce(public.profiles.contact_email, excluded.contact_email),
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      preferred_language = coalesce(public.profiles.preferred_language, excluded.preferred_language);

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict do nothing;

  return new;
end;
$$;

create or replace function public.generate_subscription_code()
returns text
language plpgsql
set search_path = public
as $$
declare
  candidate text;
begin
  loop
    candidate := 'SUB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (
      select 1
      from public.user_subscriptions
      where subscription_code = candidate
    );
  end loop;

  return candidate;
end;
$$;

alter table public.user_subscriptions
add column if not exists stadium_id uuid references public.stadiums(id) on delete restrict,
add column if not exists seat_id uuid references public.seats(id) on delete restrict,
add column if not exists gate_id uuid references public.gates(id) on delete set null,
add column if not exists subscription_code text,
add column if not exists qr_token_version integer not null default 1;

update public.user_subscriptions
set subscription_code = public.generate_subscription_code()
where subscription_code is null;

alter table public.user_subscriptions
alter column subscription_code set default public.generate_subscription_code();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_subscriptions_qr_token_version_check'
  ) then
    alter table public.user_subscriptions
      add constraint user_subscriptions_qr_token_version_check
      check (qr_token_version >= 1);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_subscriptions_subscription_code_key'
  ) then
    alter table public.user_subscriptions
      add constraint user_subscriptions_subscription_code_key
      unique (subscription_code);
  end if;
end $$;

create index if not exists user_subscriptions_stadium_seat_idx
  on public.user_subscriptions (stadium_id, seat_id, status, starts_at, ends_at desc);

create table if not exists public.subscription_scans (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.user_subscriptions(id) on delete set null,
  match_id uuid not null references public.matches(id) on delete cascade,
  steward_user_id uuid references auth.users(id) on delete set null,
  gate_id uuid references public.gates(id) on delete set null,
  scanned_at timestamptz not null default now(),
  result public.scan_result not null,
  device_label text,
  token_fingerprint text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists subscription_scans_match_result_idx
  on public.subscription_scans (match_id, result, scanned_at desc);

create unique index if not exists subscription_scans_valid_match_uidx
  on public.subscription_scans (subscription_id, match_id)
  where result = 'valid';

alter table public.subscription_scans enable row level security;

drop policy if exists subscription_scans_select_holder_or_steward on public.subscription_scans;
create policy subscription_scans_select_holder_or_steward
on public.subscription_scans
for select
using (
  public.user_has_any_role(array['steward', 'admin', 'superadmin']::public.app_role[])
  or exists (
    select 1
    from public.user_subscriptions us
    where us.id = subscription_scans.subscription_id
      and us.user_id = auth.uid()
  )
);

drop policy if exists subscription_scans_admin_manage on public.subscription_scans;
create policy subscription_scans_admin_manage
on public.subscription_scans
for all
using (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]))
with check (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]));

insert into public.subscription_products (
  code,
  name,
  duration_type,
  duration_months,
  price_cents,
  currency,
  description,
  is_active
)
values
  (
    'annual-pass-free',
    'Abonament anual gratuit',
    'annual',
    12,
    0,
    'MDL',
    'Abonament gratuit pentru invitati, protocol sau alte alocari speciale.',
    true
  ),
  (
    'semiannual-pass-free',
    'Abonament semi-anual gratuit',
    'semiannual',
    6,
    0,
    'MDL',
    'Abonament gratuit valabil pentru jumatate de sezon.',
    true
  )
on conflict (code) do update
set
  name = excluded.name,
  duration_type = excluded.duration_type,
  duration_months = excluded.duration_months,
  price_cents = excluded.price_cents,
  currency = excluded.currency,
  description = excluded.description,
  is_active = excluded.is_active,
  updated_at = now();

create or replace view public.subscription_delivery_view
with (security_invoker = true)
as
select
  us.id as subscription_id,
  us.user_id,
  us.status,
  us.starts_at,
  us.ends_at,
  us.price_paid_cents,
  us.currency,
  us.source,
  us.note,
  us.subscription_code,
  us.qr_token_version,
  us.stadium_id,
  stadium.name as stadium_name,
  us.seat_id,
  seat.row_label,
  seat.seat_number,
  seat.seat_label,
  sector.name as sector_name,
  sector.code as sector_code,
  sector.color as sector_color,
  gate.name as gate_name,
  profile.full_name as holder_name,
  profile.email as holder_email,
  profile.birth_date as holder_birth_date,
  product.id as product_id,
  product.code as product_code,
  product.name as product_name,
  product.duration_type,
  product.duration_months,
  product.price_cents as product_price_cents,
  product.currency as product_currency,
  product.description as product_description,
  product.is_active as product_is_active
from public.user_subscriptions us
join public.subscription_products product on product.id = us.product_id
join public.profiles profile on profile.id = us.user_id
join public.stadiums stadium on stadium.id = us.stadium_id
left join public.seats seat on seat.id = us.seat_id
left join public.stadium_sectors sector on sector.id = seat.sector_id
left join public.gates gate on gate.id = coalesce(us.gate_id, seat.gate_id, sector.gate_id);

create or replace function public.scan_ticket_token(
  p_match_id uuid,
  p_ticket_code text,
  p_token_version integer,
  p_steward_id uuid,
  p_gate_id uuid default null,
  p_device_label text default null,
  p_token_fingerprint text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket record;
  v_scan_id uuid;
  v_scanned_at timestamptz;
begin
  select
    t.id,
    t.user_id,
    t.match_id,
    t.ticket_code,
    t.status,
    t.used_at,
    t.qr_token_version,
    m.title as match_title,
    sector.name as sector_name,
    seat.seat_label,
    profile.full_name as holder_name,
    profile.birth_date as holder_birth_date
  into v_ticket
  from public.tickets t
  join public.matches m on m.id = t.match_id
  join public.seats seat on seat.id = t.seat_id
  join public.stadium_sectors sector on sector.id = seat.sector_id
  left join public.profiles profile on profile.id = t.user_id
  where t.ticket_code = p_ticket_code
  for update;

  if not found then
    insert into public.ticket_scans (ticket_id, match_id, steward_user_id, gate_id, result, device_label, token_fingerprint)
    values (null, p_match_id, p_steward_id, p_gate_id, 'not_found', p_device_label, p_token_fingerprint)
    returning id, scanned_at into v_scan_id, v_scanned_at;

    return jsonb_build_object(
      'result', 'not_found',
      'message', 'Biletul nu exista.',
      'ticket_code', p_ticket_code,
      'scanned_at', v_scanned_at,
      'credential_kind', 'ticket'
    );
  end if;

  if v_ticket.qr_token_version <> p_token_version then
    insert into public.ticket_scans (ticket_id, match_id, steward_user_id, gate_id, result, device_label, token_fingerprint)
    values (v_ticket.id, p_match_id, p_steward_id, p_gate_id, 'invalid_token', p_device_label, p_token_fingerprint)
    returning id, scanned_at into v_scan_id, v_scanned_at;

    return jsonb_build_object(
      'result', 'invalid_token',
      'message', 'QR-ul a fost reemis si versiunea veche nu mai este valida.',
      'ticket_code', v_ticket.ticket_code,
      'match_title', v_ticket.match_title,
      'sector_label', v_ticket.sector_name,
      'seat_label', v_ticket.seat_label,
      'scanned_at', v_scanned_at,
      'holder_name', v_ticket.holder_name,
      'holder_birth_date', v_ticket.holder_birth_date,
      'credential_kind', 'ticket'
    );
  end if;

  if v_ticket.match_id <> p_match_id then
    insert into public.ticket_scans (ticket_id, match_id, steward_user_id, gate_id, result, device_label, token_fingerprint)
    values (v_ticket.id, p_match_id, p_steward_id, p_gate_id, 'wrong_match', p_device_label, p_token_fingerprint)
    returning id, scanned_at into v_scan_id, v_scanned_at;

    return jsonb_build_object(
      'result', 'wrong_match',
      'message', 'Biletul apartine altui meci.',
      'ticket_code', v_ticket.ticket_code,
      'match_title', v_ticket.match_title,
      'sector_label', v_ticket.sector_name,
      'seat_label', v_ticket.seat_label,
      'scanned_at', v_scanned_at,
      'holder_name', v_ticket.holder_name,
      'holder_birth_date', v_ticket.holder_birth_date,
      'credential_kind', 'ticket'
    );
  end if;

  if v_ticket.status = 'canceled' then
    insert into public.ticket_scans (ticket_id, match_id, steward_user_id, gate_id, result, device_label, token_fingerprint)
    values (v_ticket.id, p_match_id, p_steward_id, p_gate_id, 'canceled', p_device_label, p_token_fingerprint)
    returning id, scanned_at into v_scan_id, v_scanned_at;

    return jsonb_build_object(
      'result', 'canceled',
      'message', 'Biletul este anulat.',
      'ticket_code', v_ticket.ticket_code,
      'match_title', v_ticket.match_title,
      'sector_label', v_ticket.sector_name,
      'seat_label', v_ticket.seat_label,
      'scanned_at', v_scanned_at,
      'holder_name', v_ticket.holder_name,
      'holder_birth_date', v_ticket.holder_birth_date,
      'credential_kind', 'ticket'
    );
  end if;

  if v_ticket.status = 'blocked' then
    insert into public.ticket_scans (ticket_id, match_id, steward_user_id, gate_id, result, device_label, token_fingerprint)
    values (v_ticket.id, p_match_id, p_steward_id, p_gate_id, 'blocked', p_device_label, p_token_fingerprint)
    returning id, scanned_at into v_scan_id, v_scanned_at;

    return jsonb_build_object(
      'result', 'blocked',
      'message', 'Biletul este blocat si nu permite acces.',
      'ticket_code', v_ticket.ticket_code,
      'match_title', v_ticket.match_title,
      'sector_label', v_ticket.sector_name,
      'seat_label', v_ticket.seat_label,
      'scanned_at', v_scanned_at,
      'holder_name', v_ticket.holder_name,
      'holder_birth_date', v_ticket.holder_birth_date,
      'credential_kind', 'ticket'
    );
  end if;

  if v_ticket.used_at is not null or v_ticket.status = 'used' then
    insert into public.ticket_scans (ticket_id, match_id, steward_user_id, gate_id, result, device_label, token_fingerprint)
    values (v_ticket.id, p_match_id, p_steward_id, p_gate_id, 'already_used', p_device_label, p_token_fingerprint)
    returning id, scanned_at into v_scan_id, v_scanned_at;

    return jsonb_build_object(
      'result', 'already_used',
      'message', 'Biletul a fost deja folosit.',
      'ticket_code', v_ticket.ticket_code,
      'match_title', v_ticket.match_title,
      'sector_label', v_ticket.sector_name,
      'seat_label', v_ticket.seat_label,
      'scanned_at', v_scanned_at,
      'holder_name', v_ticket.holder_name,
      'holder_birth_date', v_ticket.holder_birth_date,
      'credential_kind', 'ticket'
    );
  end if;

  update public.tickets
  set status = 'used',
      used_at = now()
  where id = v_ticket.id;

  insert into public.ticket_scans (ticket_id, match_id, steward_user_id, gate_id, result, device_label, token_fingerprint)
  values (v_ticket.id, p_match_id, p_steward_id, p_gate_id, 'valid', p_device_label, p_token_fingerprint)
  returning id, scanned_at into v_scan_id, v_scanned_at;

  update public.tickets
  set last_scan_id = v_scan_id
  where id = v_ticket.id;

  perform public.sync_abuse_flags_for_user(v_ticket.user_id);

  return jsonb_build_object(
    'result', 'valid',
    'message', 'Bilet valid. Acces permis.',
    'ticket_code', v_ticket.ticket_code,
    'match_title', v_ticket.match_title,
    'sector_label', v_ticket.sector_name,
    'seat_label', v_ticket.seat_label,
    'scanned_at', v_scanned_at,
    'holder_name', v_ticket.holder_name,
    'holder_birth_date', v_ticket.holder_birth_date,
    'credential_kind', 'ticket'
  );
end;
$$;

create or replace function public.scan_subscription_token(
  p_match_id uuid,
  p_subscription_code text,
  p_token_version integer,
  p_steward_id uuid,
  p_gate_id uuid default null,
  p_device_label text default null,
  p_token_fingerprint text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription record;
  v_scan_id uuid;
  v_scanned_at timestamptz;
begin
  select
    us.id,
    us.user_id,
    us.status,
    us.starts_at,
    us.ends_at,
    us.subscription_code,
    us.qr_token_version,
    us.stadium_id,
    us.gate_id,
    m.title as match_title,
    m.starts_at as match_starts_at,
    m.stadium_id as match_stadium_id,
    profile.full_name as holder_name,
    profile.birth_date as holder_birth_date,
    seat.seat_label,
    seat.row_label,
    seat.seat_number,
    sector.name as sector_name
  into v_subscription
  from public.user_subscriptions us
  join public.matches m on m.id = p_match_id
  join public.profiles profile on profile.id = us.user_id
  left join public.seats seat on seat.id = us.seat_id
  left join public.stadium_sectors sector on sector.id = seat.sector_id
  where us.subscription_code = p_subscription_code
  for update;

  if not found then
    insert into public.subscription_scans (
      subscription_id,
      match_id,
      steward_user_id,
      gate_id,
      result,
      device_label,
      token_fingerprint
    )
    values (
      null,
      p_match_id,
      p_steward_id,
      p_gate_id,
      'not_found',
      p_device_label,
      p_token_fingerprint
    )
    returning id, scanned_at into v_scan_id, v_scanned_at;

    return jsonb_build_object(
      'result', 'not_found',
      'message', 'Abonamentul nu exista.',
      'ticket_code', p_subscription_code,
      'scanned_at', v_scanned_at,
      'credential_kind', 'subscription'
    );
  end if;

  if v_subscription.qr_token_version <> p_token_version then
    insert into public.subscription_scans (
      subscription_id,
      match_id,
      steward_user_id,
      gate_id,
      result,
      device_label,
      token_fingerprint
    )
    values (
      v_subscription.id,
      p_match_id,
      p_steward_id,
      p_gate_id,
      'invalid_token',
      p_device_label,
      p_token_fingerprint
    )
    returning id, scanned_at into v_scan_id, v_scanned_at;

    return jsonb_build_object(
      'result', 'invalid_token',
      'message', 'Abonamentul a fost reemis si versiunea veche nu mai este valida.',
      'ticket_code', v_subscription.subscription_code,
      'match_title', v_subscription.match_title,
      'sector_label', v_subscription.sector_name,
      'seat_label', v_subscription.seat_label,
      'scanned_at', v_scanned_at,
      'holder_name', v_subscription.holder_name,
      'holder_birth_date', v_subscription.holder_birth_date,
      'credential_kind', 'subscription'
    );
  end if;

  if v_subscription.status = 'canceled' then
    insert into public.subscription_scans (
      subscription_id,
      match_id,
      steward_user_id,
      gate_id,
      result,
      device_label,
      token_fingerprint
    )
    values (
      v_subscription.id,
      p_match_id,
      p_steward_id,
      p_gate_id,
      'canceled',
      p_device_label,
      p_token_fingerprint
    )
    returning id, scanned_at into v_scan_id, v_scanned_at;

    return jsonb_build_object(
      'result', 'canceled',
      'message', 'Abonamentul este anulat.',
      'ticket_code', v_subscription.subscription_code,
      'match_title', v_subscription.match_title,
      'sector_label', v_subscription.sector_name,
      'seat_label', v_subscription.seat_label,
      'scanned_at', v_scanned_at,
      'holder_name', v_subscription.holder_name,
      'holder_birth_date', v_subscription.holder_birth_date,
      'credential_kind', 'subscription'
    );
  end if;

  if v_subscription.stadium_id is null or v_subscription.match_stadium_id <> v_subscription.stadium_id then
    insert into public.subscription_scans (
      subscription_id,
      match_id,
      steward_user_id,
      gate_id,
      result,
      device_label,
      token_fingerprint
    )
    values (
      v_subscription.id,
      p_match_id,
      p_steward_id,
      p_gate_id,
      'wrong_match',
      p_device_label,
      p_token_fingerprint
    )
    returning id, scanned_at into v_scan_id, v_scanned_at;

    return jsonb_build_object(
      'result', 'wrong_match',
      'message', 'Abonamentul nu este valabil pentru stadionul acestui meci.',
      'ticket_code', v_subscription.subscription_code,
      'match_title', v_subscription.match_title,
      'sector_label', v_subscription.sector_name,
      'seat_label', v_subscription.seat_label,
      'scanned_at', v_scanned_at,
      'holder_name', v_subscription.holder_name,
      'holder_birth_date', v_subscription.holder_birth_date,
      'credential_kind', 'subscription'
    );
  end if;

  if v_subscription.starts_at > v_subscription.match_starts_at or v_subscription.ends_at < v_subscription.match_starts_at then
    insert into public.subscription_scans (
      subscription_id,
      match_id,
      steward_user_id,
      gate_id,
      result,
      device_label,
      token_fingerprint
    )
    values (
      v_subscription.id,
      p_match_id,
      p_steward_id,
      p_gate_id,
      'blocked',
      p_device_label,
      p_token_fingerprint
    )
    returning id, scanned_at into v_scan_id, v_scanned_at;

    return jsonb_build_object(
      'result', 'blocked',
      'message', 'Abonamentul nu este valabil pentru data acestui meci.',
      'ticket_code', v_subscription.subscription_code,
      'match_title', v_subscription.match_title,
      'sector_label', v_subscription.sector_name,
      'seat_label', v_subscription.seat_label,
      'scanned_at', v_scanned_at,
      'holder_name', v_subscription.holder_name,
      'holder_birth_date', v_subscription.holder_birth_date,
      'credential_kind', 'subscription'
    );
  end if;

  if exists (
    select 1
    from public.subscription_scans ss
    where ss.subscription_id = v_subscription.id
      and ss.match_id = p_match_id
      and ss.result = 'valid'
  ) then
    insert into public.subscription_scans (
      subscription_id,
      match_id,
      steward_user_id,
      gate_id,
      result,
      device_label,
      token_fingerprint
    )
    values (
      v_subscription.id,
      p_match_id,
      p_steward_id,
      coalesce(p_gate_id, v_subscription.gate_id),
      'already_used',
      p_device_label,
      p_token_fingerprint
    )
    returning id, scanned_at into v_scan_id, v_scanned_at;

    return jsonb_build_object(
      'result', 'already_used',
      'message', 'Abonamentul a fost deja folosit la acest meci.',
      'ticket_code', v_subscription.subscription_code,
      'match_title', v_subscription.match_title,
      'sector_label', v_subscription.sector_name,
      'seat_label', v_subscription.seat_label,
      'scanned_at', v_scanned_at,
      'holder_name', v_subscription.holder_name,
      'holder_birth_date', v_subscription.holder_birth_date,
      'credential_kind', 'subscription'
    );
  end if;

  insert into public.subscription_scans (
    subscription_id,
    match_id,
    steward_user_id,
    gate_id,
    result,
    device_label,
    token_fingerprint
  )
  values (
    v_subscription.id,
    p_match_id,
    p_steward_id,
    coalesce(p_gate_id, v_subscription.gate_id),
    'valid',
    p_device_label,
    p_token_fingerprint
  )
  returning id, scanned_at into v_scan_id, v_scanned_at;

  return jsonb_build_object(
    'result', 'valid',
    'message', 'Abonament valid. Acces permis.',
    'ticket_code', v_subscription.subscription_code,
    'match_title', v_subscription.match_title,
    'sector_label', v_subscription.sector_name,
    'seat_label', v_subscription.seat_label,
    'scanned_at', v_scanned_at,
    'holder_name', v_subscription.holder_name,
    'holder_birth_date', v_subscription.holder_birth_date,
    'credential_kind', 'subscription'
  );
end;
$$;

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
        from public.user_subscriptions us
        where us.seat_id = seat.id
          and us.stadium_id = m.stadium_id
          and us.status = 'active'
          and us.starts_at <= m.starts_at
          and us.ends_at >= m.starts_at
      ) then 'reserved'
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
     or exists (
       select 1
       from public.user_subscriptions us
       where us.seat_id = seat.id
         and us.stadium_id = m.stadium_id
         and us.status = 'active'
         and us.starts_at <= m.starts_at
         and us.ends_at >= m.starts_at
     )
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
    'expires_at', v_expires_at
  );
end;
$$;

drop view if exists public.scan_log_overview;

create view public.scan_log_overview
with (security_invoker = true)
as
select
  ts.id,
  ts.match_id,
  m.slug as match_slug,
  m.title as match_title,
  ts.scanned_at,
  ts.result,
  ts.device_label,
  ts.token_fingerprint,
  'ticket'::text as credential_kind,
  ts.ticket_id,
  t.ticket_code,
  t.status as ticket_status,
  t.source::text as ticket_source,
  null::uuid as subscription_id,
  null::text as subscription_code,
  null::public.subscription_status as subscription_status,
  seat.seat_label,
  seat.row_label,
  seat.seat_number,
  sector.name as sector_name,
  sector.code as sector_code,
  stand.name as stand_name,
  gate.name as gate_name,
  steward.id as steward_user_id,
  steward.full_name as steward_name,
  steward.email as steward_email,
  holder.id as holder_user_id,
  holder.full_name as holder_name,
  holder.email as holder_email,
  holder.birth_date as holder_birth_date
from public.ticket_scans ts
join public.matches m on m.id = ts.match_id
left join public.tickets t on t.id = ts.ticket_id
left join public.seats seat on seat.id = t.seat_id
left join public.stadium_sectors sector on sector.id = seat.sector_id
left join public.stadium_stands stand on stand.id = sector.stand_id
left join public.gates gate on gate.id = coalesce(ts.gate_id, t.gate_id, seat.gate_id)
left join public.profiles steward on steward.id = ts.steward_user_id
left join public.profiles holder on holder.id = t.user_id
union all
select
  ss.id,
  ss.match_id,
  m.slug as match_slug,
  m.title as match_title,
  ss.scanned_at,
  ss.result,
  ss.device_label,
  ss.token_fingerprint,
  'subscription'::text as credential_kind,
  null::uuid as ticket_id,
  us.subscription_code as ticket_code,
  null::public.ticket_status as ticket_status,
  us.source::text as ticket_source,
  ss.subscription_id,
  us.subscription_code,
  us.status as subscription_status,
  seat.seat_label,
  seat.row_label,
  seat.seat_number,
  sector.name as sector_name,
  sector.code as sector_code,
  stand.name as stand_name,
  gate.name as gate_name,
  steward.id as steward_user_id,
  steward.full_name as steward_name,
  steward.email as steward_email,
  holder.id as holder_user_id,
  holder.full_name as holder_name,
  holder.email as holder_email,
  holder.birth_date as holder_birth_date
from public.subscription_scans ss
join public.matches m on m.id = ss.match_id
left join public.user_subscriptions us on us.id = ss.subscription_id
left join public.seats seat on seat.id = us.seat_id
left join public.stadium_sectors sector on sector.id = seat.sector_id
left join public.stadium_stands stand on stand.id = sector.stand_id
left join public.gates gate on gate.id = coalesce(ss.gate_id, us.gate_id, seat.gate_id, sector.gate_id)
left join public.profiles steward on steward.id = ss.steward_user_id
left join public.profiles holder on holder.id = us.user_id;

create or replace view public.match_reporting_overview
with (security_invoker = true)
as
with ticket_agg as (
  select
    t.match_id,
    count(*) filter (where t.status in ('active', 'used', 'blocked'))::integer as issued_count,
    count(*) filter (where t.source = 'paid_purchase' and t.status in ('active', 'used', 'blocked'))::integer as purchased_count,
    count(*) filter (
      where t.source in ('complimentary', 'sponsor', 'media', 'vip', 'staff', 'admin_reservation')
        and t.status in ('active', 'used', 'blocked')
    )::integer as internal_count,
    count(*) filter (where t.status = 'used')::integer as entered_ticket_count,
    count(*) filter (where t.status = 'active')::integer as active_count,
    count(*) filter (where t.status = 'canceled')::integer as canceled_count,
    count(*) filter (where t.status = 'blocked')::integer as blocked_count
  from public.tickets t
  group by t.match_id
),
ticket_scan_agg as (
  select
    ts.match_id,
    count(*) filter (where ts.result = 'already_used')::integer as repeated_count,
    count(*) filter (where ts.result = 'valid')::integer as valid_scan_count,
    count(*) filter (
      where ts.result in ('invalid_token', 'wrong_match', 'canceled', 'blocked', 'not_found')
    )::integer as invalid_scan_count,
    max(ts.scanned_at) as latest_scan_at
  from public.ticket_scans ts
  group by ts.match_id
),
subscription_scan_agg as (
  select
    ss.match_id,
    count(*) filter (where ss.result = 'already_used')::integer as repeated_count,
    count(*) filter (where ss.result = 'valid')::integer as valid_scan_count,
    count(*) filter (
      where ss.result in ('invalid_token', 'wrong_match', 'canceled', 'blocked', 'not_found')
    )::integer as invalid_scan_count,
    max(ss.scanned_at) as latest_scan_at
  from public.subscription_scans ss
  group by ss.match_id
)
select
  m.id as match_id,
  m.slug,
  m.title,
  m.competition_name,
  m.opponent_name,
  s.name as stadium_name,
  m.starts_at,
  m.status,
  coalesce(ticket_agg.issued_count, 0) as issued_count,
  coalesce(ticket_agg.purchased_count, 0) as purchased_count,
  coalesce(ticket_agg.internal_count, 0) as internal_count,
  (coalesce(ticket_agg.entered_ticket_count, 0) + coalesce(subscription_scan_agg.valid_scan_count, 0))::integer as entered_count,
  coalesce(ticket_agg.active_count, 0) as active_count,
  coalesce(ticket_agg.canceled_count, 0) as canceled_count,
  coalesce(ticket_agg.blocked_count, 0) as blocked_count,
  (coalesce(ticket_scan_agg.repeated_count, 0) + coalesce(subscription_scan_agg.repeated_count, 0))::integer as repeated_count,
  (coalesce(ticket_scan_agg.valid_scan_count, 0) + coalesce(subscription_scan_agg.valid_scan_count, 0))::integer as valid_scan_count,
  (coalesce(ticket_scan_agg.invalid_scan_count, 0) + coalesce(subscription_scan_agg.invalid_scan_count, 0))::integer as invalid_scan_count,
  case
    when ticket_scan_agg.latest_scan_at is null and subscription_scan_agg.latest_scan_at is null
      then null
    when ticket_scan_agg.latest_scan_at is null
      then subscription_scan_agg.latest_scan_at
    when subscription_scan_agg.latest_scan_at is null
      then ticket_scan_agg.latest_scan_at
    else greatest(ticket_scan_agg.latest_scan_at, subscription_scan_agg.latest_scan_at)
  end as latest_scan_at
from public.matches m
join public.stadiums s on s.id = m.stadium_id
left join ticket_agg on ticket_agg.match_id = m.id
left join ticket_scan_agg on ticket_scan_agg.match_id = m.id
left join subscription_scan_agg on subscription_scan_agg.match_id = m.id;
