create or replace view public.user_abuse_metrics
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
) as block_stats on block_stats.user_id = p.id;

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
) as scan_stats on scan_stats.user_id = p.id;
