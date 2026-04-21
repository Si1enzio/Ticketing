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
  coalesce(ticket_stats.issued_count, 0)::integer as issued_count,
  coalesce(ticket_stats.purchased_count, 0)::integer as purchased_count,
  coalesce(ticket_stats.internal_count, 0)::integer as internal_count,
  coalesce(ticket_stats.entered_count, 0)::integer as entered_count,
  coalesce(ticket_stats.active_count, 0)::integer as active_count,
  coalesce(ticket_stats.canceled_count, 0)::integer as canceled_count,
  coalesce(ticket_stats.blocked_count, 0)::integer as blocked_count,
  coalesce(scan_stats.repeated_count, 0)::integer as repeated_count,
  coalesce(scan_stats.valid_scan_count, 0)::integer as valid_scan_count,
  coalesce(scan_stats.invalid_scan_count, 0)::integer as invalid_scan_count,
  scan_stats.latest_scan_at
from public.matches m
join public.stadiums s on s.id = m.stadium_id
left join lateral (
  select
    count(*) filter (where t.status in ('active', 'used', 'blocked')) as issued_count,
    count(*) filter (
      where t.source = 'paid_purchase'
        and t.status in ('active', 'used', 'blocked')
    ) as purchased_count,
    count(*) filter (
      where t.source in ('complimentary', 'sponsor', 'media', 'vip', 'staff', 'admin_reservation')
        and t.status in ('active', 'used', 'blocked')
    ) as internal_count,
    count(*) filter (where t.status = 'used') as entered_count,
    count(*) filter (where t.status = 'active') as active_count,
    count(*) filter (where t.status = 'canceled') as canceled_count,
    count(*) filter (where t.status = 'blocked') as blocked_count
  from public.tickets t
  where t.match_id = m.id
) as ticket_stats on true
left join lateral (
  select
    count(*) filter (where ts.result = 'already_used') as repeated_count,
    count(*) filter (where ts.result = 'valid') as valid_scan_count,
    count(*) filter (
      where ts.result in ('invalid_token', 'wrong_match', 'canceled', 'blocked', 'not_found')
    ) as invalid_scan_count,
    max(ts.scanned_at) as latest_scan_at
  from public.ticket_scans ts
  where ts.match_id = m.id
) as scan_stats on true;
