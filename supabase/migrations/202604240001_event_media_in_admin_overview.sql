begin;

drop view if exists public.match_admin_overview;

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
  m.poster_url,
  m.banner_url,
  m.starts_at,
  m.status,
  m.scanner_enabled,
  coalesce(ms.max_tickets_per_user, 4) as max_tickets_per_user,
  ms.opens_at as reservation_opens_at,
  ms.closes_at as reservation_closes_at,
  coalesce(ticket_stats.issued_count, 0) as issued_count,
  coalesce(ticket_stats.scanned_count, 0) as scanned_count,
  coalesce(tus.no_show_count, 0) as no_show_count,
  coalesce(tus.duplicate_scan_attempts, 0) as duplicate_scan_attempts,
  coalesce(ms.ticketing_mode, 'free') as ticketing_mode,
  coalesce(ms.ticket_price_cents, 0) as ticket_price_cents,
  coalesce(ms.currency, 'MDL') as currency
from public.matches m
join public.stadiums s on s.id = m.stadium_id
left join public.match_settings ms on ms.match_id = m.id
left join public.ticket_usage_summary tus on tus.match_id = m.id
left join lateral public.get_match_public_ticket_stats(m.id) ticket_stats on true
where public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]);

commit;
