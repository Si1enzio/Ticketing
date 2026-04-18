create type public.subscription_duration as enum ('annual', 'semiannual');
create type public.subscription_status as enum ('active', 'expired', 'canceled');

create table if not exists public.stadium_stands (
  id uuid primary key default gen_random_uuid(),
  stadium_id uuid not null references public.stadiums(id) on delete cascade,
  name text not null,
  code text not null,
  color text not null default '#111111',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (stadium_id, code)
);

create index if not exists stadium_stands_stadium_sort_idx
  on public.stadium_stands (stadium_id, sort_order, name);

drop trigger if exists stadium_stands_touch_updated_at on public.stadium_stands;
create trigger stadium_stands_touch_updated_at
before update on public.stadium_stands
for each row execute function public.touch_updated_at();

alter table public.stadium_sectors
add column if not exists stand_id uuid references public.stadium_stands(id) on delete set null;

create index if not exists stadium_sectors_stand_idx
  on public.stadium_sectors (stand_id, sort_order, code);

create table if not exists public.subscription_products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  duration_type public.subscription_duration not null,
  duration_months integer not null check (duration_months > 0),
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'MDL',
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists subscription_products_touch_updated_at on public.subscription_products;
create trigger subscription_products_touch_updated_at
before update on public.subscription_products
for each row execute function public.touch_updated_at();

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.subscription_products(id) on delete restrict,
  status public.subscription_status not null default 'active',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  price_paid_cents integer not null default 0 check (price_paid_cents >= 0),
  currency text not null default 'MDL',
  source text not null default 'admin_issue',
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists user_subscriptions_user_status_idx
  on public.user_subscriptions (user_id, status, ends_at desc);

create index if not exists user_subscriptions_product_idx
  on public.user_subscriptions (product_id, status, starts_at desc);

drop trigger if exists user_subscriptions_touch_updated_at on public.user_subscriptions;
create trigger user_subscriptions_touch_updated_at
before update on public.user_subscriptions
for each row execute function public.touch_updated_at();

alter table public.stadium_stands enable row level security;
alter table public.subscription_products enable row level security;
alter table public.user_subscriptions enable row level security;

drop policy if exists stands_public_read on public.stadium_stands;
create policy stands_public_read
on public.stadium_stands
for select
using (true);

drop policy if exists stands_admin_manage on public.stadium_stands;
create policy stands_admin_manage
on public.stadium_stands
for all
using (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]))
with check (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]));

drop policy if exists subscription_products_public_read on public.subscription_products;
create policy subscription_products_public_read
on public.subscription_products
for select
using (true);

drop policy if exists subscription_products_admin_manage on public.subscription_products;
create policy subscription_products_admin_manage
on public.subscription_products
for all
using (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]))
with check (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]));

drop policy if exists user_subscriptions_select_own_or_admin on public.user_subscriptions;
create policy user_subscriptions_select_own_or_admin
on public.user_subscriptions
for select
using (
  auth.uid() = user_id
  or public.user_has_any_role(array['admin', 'superadmin']::public.app_role[])
);

drop policy if exists user_subscriptions_admin_manage on public.user_subscriptions;
create policy user_subscriptions_admin_manage
on public.user_subscriptions
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
    'annual-pass',
    'Abonament anual',
    'annual',
    12,
    180000,
    'MDL',
    'Acces extins pentru sezonul complet si evenimente eligibile.',
    true
  ),
  (
    'semiannual-pass',
    'Abonament semi-anual',
    'semiannual',
    6,
    95000,
    'MDL',
    'Acces pentru jumatate de sezon si meciurile eligibile.',
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

create or replace view public.match_reporting_overview
with (security_invoker = true)
as
select
  m.id as match_id,
  m.slug,
  m.title,
  m.competition_name,
  m.opponent_name,
  s.name as stadium_name,
  m.starts_at,
  m.status,
  count(t.id) filter (where t.status in ('active', 'used', 'blocked'))::integer as issued_count,
  count(t.id) filter (where t.source = 'paid_purchase' and t.status in ('active', 'used', 'blocked'))::integer as purchased_count,
  count(t.id) filter (
    where t.source in ('complimentary', 'sponsor', 'media', 'vip', 'staff', 'admin_reservation')
      and t.status in ('active', 'used', 'blocked')
  )::integer as internal_count,
  count(t.id) filter (where t.status = 'used')::integer as entered_count,
  count(t.id) filter (where t.status = 'active')::integer as active_count,
  count(t.id) filter (where t.status = 'canceled')::integer as canceled_count,
  count(t.id) filter (where t.status = 'blocked')::integer as blocked_count,
  count(ts.id) filter (where ts.result = 'already_used')::integer as repeated_count,
  count(ts.id) filter (where ts.result = 'valid')::integer as valid_scan_count,
  count(ts.id) filter (
    where ts.result in ('invalid_token', 'wrong_match', 'canceled', 'blocked', 'not_found')
  )::integer as invalid_scan_count,
  max(ts.scanned_at) as latest_scan_at
from public.matches m
join public.stadiums s on s.id = m.stadium_id
left join public.tickets t on t.match_id = m.id
left join public.ticket_scans ts on ts.match_id = m.id
group by m.id, m.slug, m.title, m.competition_name, m.opponent_name, s.name, m.starts_at, m.status;

create or replace view public.scan_log_overview
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
  ts.ticket_id,
  t.ticket_code,
  t.status as ticket_status,
  t.source as ticket_source,
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
  holder.email as holder_email
from public.ticket_scans ts
join public.matches m on m.id = ts.match_id
left join public.tickets t on t.id = ts.ticket_id
left join public.seats seat on seat.id = t.seat_id
left join public.stadium_sectors sector on sector.id = seat.sector_id
left join public.stadium_stands stand on stand.id = sector.stand_id
left join public.gates gate on gate.id = coalesce(ts.gate_id, t.gate_id, seat.gate_id)
left join public.profiles steward on steward.id = ts.steward_user_id
left join public.profiles holder on holder.id = t.user_id;

create or replace view public.admin_user_profile_stats
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
  uam.active_block_until,
  count(t.id) filter (where t.source = 'paid_purchase')::integer as paid_tickets,
  count(t.id) filter (where t.source <> 'paid_purchase')::integer as non_paid_tickets,
  count(t.id) filter (where t.status = 'used')::integer as used_tickets,
  count(t.id) filter (where t.status = 'canceled')::integer as canceled_tickets,
  count(distinct us.id) filter (where us.status = 'active' and us.ends_at > now())::integer as active_subscriptions,
  coalesce(sum(pay.amount_cents) filter (where pay.status = 'paid'), 0)::integer as total_paid_cents,
  max(ts.scanned_at) as last_entry_at
from public.profiles p
left join public.user_abuse_metrics uam on uam.user_id = p.id
left join public.tickets t on t.user_id = p.id
left join public.user_subscriptions us on us.user_id = p.id
left join public.payments pay on pay.user_id = p.id
left join public.ticket_scans ts on ts.ticket_id = t.id and ts.result = 'valid'
group by
  p.id,
  p.email,
  p.full_name,
  p.can_reserve,
  uam.total_reserved,
  uam.total_scanned,
  uam.no_show_ratio,
  uam.abuse_score,
  uam.active_block_type,
  uam.active_block_until;
