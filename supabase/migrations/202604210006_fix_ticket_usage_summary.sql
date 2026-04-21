create or replace view public.ticket_usage_summary
with (security_invoker = true)
as
select
  m.id as match_id,
  coalesce(ticket_stats.issued_count, 0)::integer as issued_count,
  coalesce(ticket_stats.scanned_count, 0)::integer as scanned_count,
  case
    when m.starts_at < now() then coalesce(ticket_stats.no_show_count, 0)::integer
    else 0
  end as no_show_count,
  coalesce(scan_stats.duplicate_scan_attempts, 0)::integer as duplicate_scan_attempts
from public.matches m
left join (
  select
    t.match_id,
    count(*) filter (where t.status in ('active', 'used', 'blocked')) as issued_count,
    count(*) filter (where t.status = 'used') as scanned_count,
    count(*) filter (where t.status in ('active', 'blocked')) as no_show_count
  from public.tickets t
  group by t.match_id
) ticket_stats on ticket_stats.match_id = m.id
left join (
  select
    ts.match_id,
    count(*) filter (where ts.result = 'already_used') as duplicate_scan_attempts
  from public.ticket_scans ts
  group by ts.match_id
) scan_stats on scan_stats.match_id = m.id;
