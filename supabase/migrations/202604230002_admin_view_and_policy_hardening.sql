begin;

drop policy if exists teams_public_read on public.teams;
drop policy if exists teams_admin_read on public.teams;
create policy teams_admin_read
on public.teams
for select
using (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]));

drop policy if exists subscription_products_public_read on public.subscription_products;
drop policy if exists subscription_products_authenticated_read on public.subscription_products;
create policy subscription_products_authenticated_read
on public.subscription_products
for select
using (auth.uid() is not null);

drop policy if exists sector_overrides_public_read on public.match_sector_overrides;
drop policy if exists sector_overrides_authenticated_read on public.match_sector_overrides;
create policy sector_overrides_authenticated_read
on public.match_sector_overrides
for select
using (auth.uid() is not null);

drop view if exists public.admin_user_profile_stats;
drop view if exists public.admin_user_overview;
drop view if exists public.user_abuse_metrics;
drop view if exists public.match_admin_overview;
drop view if exists public.scan_log_overview;
drop view if exists public.match_reporting_overview;

create view public.user_abuse_metrics
with (security_invoker = true)
as
select
  p.id as user_id,
  coalesce(p.email, '') as email,
  p.full_name,
  coalesce(ticket_stats.total_reserved, 0)::integer as total_reserved,
  coalesce(ticket_stats.total_scanned, 0)::integer as total_scanned,
  case
    when coalesce(ticket_stats.total_reserved, 0) = 0 then 0::numeric
    else round(
      (
        (
          coalesce(ticket_stats.total_reserved, 0) - coalesce(ticket_stats.total_scanned, 0)
        )::numeric / coalesce(ticket_stats.total_reserved, 0)::numeric
      ),
      2
    )
  end as no_show_ratio,
  least(
    100::numeric,
    round(
      (
        case
          when coalesce(ticket_stats.total_reserved, 0) = 0 then 0::numeric
          else (
            (
              coalesce(ticket_stats.total_reserved, 0) - coalesce(ticket_stats.total_scanned, 0)
            )::numeric / coalesce(ticket_stats.total_reserved, 0)::numeric
          ) * 70
        end
      ) + greatest(coalesce(ticket_stats.distinct_match_count, 0), 0) * 5,
      2
    )
  ) as abuse_score,
  block_stats.active_block_type,
  block_stats.active_block_until
from public.profiles p
left join (
  select
    t.user_id,
    count(*) as total_reserved,
    count(*) filter (where t.status = 'used') as total_scanned,
    count(distinct t.match_id) as distinct_match_count
  from public.tickets t
  where t.source = 'public_reservation'
  group by t.user_id
) as ticket_stats on ticket_stats.user_id = p.id
left join (
  select
    b.user_id,
    max(b.type::text) filter (
      where b.is_active
        and (b.ends_at is null or b.ends_at > now())
    ) as active_block_type,
    max(b.ends_at) filter (
      where b.is_active
        and (b.ends_at is null or b.ends_at > now())
    ) as active_block_until
  from public.user_blocks b
  group by b.user_id
) as block_stats on block_stats.user_id = p.id
where public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]);

create or replace view public.admin_user_overview
with (security_invoker = true)
as
select
  p.id as user_id,
  p.email,
  p.full_name,
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
left join public.user_abuse_metrics uam on uam.user_id = p.id
where public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]);

create view public.match_admin_overview
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
left join public.ticket_usage_summary tus on tus.match_id = m.id
where public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]);

create view public.scan_log_overview
with (security_invoker = true)
as
with scan_logs as (
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
  left join public.profiles holder on holder.id = us.user_id
)
select *
from scan_logs
where public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]);

create view public.match_reporting_overview
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
  greatest(ticket_scan_agg.latest_scan_at, subscription_scan_agg.latest_scan_at) as latest_scan_at
from public.matches m
join public.stadiums s on s.id = m.stadium_id
left join ticket_agg on ticket_agg.match_id = m.id
left join ticket_scan_agg on ticket_scan_agg.match_id = m.id
left join subscription_scan_agg on subscription_scan_agg.match_id = m.id
where public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]);

create view public.admin_user_profile_stats
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
  coalesce(uam.total_reserved, 0)::integer as total_reserved,
  coalesce(uam.total_scanned, 0)::integer as total_scanned,
  coalesce(uam.no_show_ratio, 0) as no_show_ratio,
  coalesce(uam.abuse_score, 0) as abuse_score,
  uam.active_block_type,
  uam.active_block_until,
  coalesce(ticket_stats.paid_tickets, 0)::integer as paid_tickets,
  coalesce(ticket_stats.non_paid_tickets, 0)::integer as non_paid_tickets,
  coalesce(ticket_stats.used_tickets, 0)::integer as used_tickets,
  coalesce(ticket_stats.canceled_tickets, 0)::integer as canceled_tickets,
  coalesce(subscription_stats.active_subscriptions, 0)::integer as active_subscriptions,
  coalesce(payment_stats.total_paid_cents, 0)::integer as total_paid_cents,
  scan_stats.last_entry_at
from public.profiles p
left join public.user_abuse_metrics uam on uam.user_id = p.id
left join (
  select
    t.user_id,
    count(*) filter (where t.source = 'paid_purchase') as paid_tickets,
    count(*) filter (where t.source <> 'paid_purchase') as non_paid_tickets,
    count(*) filter (where t.status = 'used') as used_tickets,
    count(*) filter (where t.status = 'canceled') as canceled_tickets
  from public.tickets t
  group by t.user_id
) as ticket_stats on ticket_stats.user_id = p.id
left join (
  select
    us.user_id,
    count(distinct us.id) filter (where us.status = 'active' and us.ends_at > now()) as active_subscriptions
  from public.user_subscriptions us
  group by us.user_id
) as subscription_stats on subscription_stats.user_id = p.id
left join (
  select
    pay.user_id,
    coalesce(sum(pay.amount_cents) filter (where pay.status = 'paid'), 0) as total_paid_cents
  from public.payments pay
  group by pay.user_id
) as payment_stats on payment_stats.user_id = p.id
left join (
  select
    t.user_id,
    max(ts.scanned_at) as last_entry_at
  from public.ticket_scans ts
  join public.tickets t on t.id = ts.ticket_id
  where ts.result = 'valid'
  group by t.user_id
) as scan_stats on scan_stats.user_id = p.id
where public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]);

commit;
