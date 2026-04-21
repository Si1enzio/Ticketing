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
