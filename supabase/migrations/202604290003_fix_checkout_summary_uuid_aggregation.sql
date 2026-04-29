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
