begin;

create or replace function public.get_match_public_ticket_stats(p_match_id uuid)
returns table (
  issued_count integer,
  scanned_count integer
)
language sql
security definer
set search_path = public
as $$
  with ticket_stats as (
    select
      count(*) filter (where t.status in ('active', 'used', 'blocked'))::integer as issued_count,
      count(*) filter (where t.status = 'used')::integer as used_ticket_count
    from public.tickets t
    where t.match_id = p_match_id
  ),
  scan_stats as (
    select
      count(distinct ts.ticket_id) filter (
        where ts.result = 'valid'
          and ts.ticket_id is not null
      )::integer as valid_ticket_scan_count
    from public.ticket_scans ts
    where ts.match_id = p_match_id
  )
  select
    coalesce(ticket_stats.issued_count, 0)::integer as issued_count,
    greatest(
      coalesce(ticket_stats.used_ticket_count, 0),
      coalesce(scan_stats.valid_ticket_scan_count, 0)
    )::integer as scanned_count
  from ticket_stats
  cross join scan_stats;
$$;

revoke all on function public.get_match_public_ticket_stats(uuid) from public;
grant execute on function public.get_match_public_ticket_stats(uuid) to anon, authenticated, service_role;

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
  coalesce(ticket_stats.issued_count, 0) as issued_count,
  coalesce(ticket_stats.scanned_count, 0) as scanned_count,
  coalesce(availability.available_count, 0)::integer as available_estimate,
  m.scanner_enabled,
  coalesce(ms.ticketing_mode, 'free') as ticketing_mode,
  coalesce(ms.ticket_price_cents, 0) as ticket_price_cents,
  coalesce(ms.currency, 'MDL') as currency
from public.matches m
join public.stadiums s on s.id = m.stadium_id
left join public.match_settings ms on ms.match_id = m.id
left join lateral public.get_match_public_ticket_stats(m.id) ticket_stats on true
left join lateral (
  select count(*) as available_count
  from public.get_match_seat_status(m.id) seat_status
  where seat_status.availability_state = 'available'
) availability on true
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
