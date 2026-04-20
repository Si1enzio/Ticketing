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
  row_sort_order bigint
)
language sql
security definer
set search_path = public
as $$
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
      when coalesce(override.is_enabled, true) = false then 'blocked'
      when seat.is_disabled then 'disabled'
      when seat.is_obstructed then 'obstructed'
      when seat.is_internal_only then 'internal'
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
    (
      select max(hold.expires_at)
      from public.seat_holds hold
      where hold.match_id = m.id
        and hold.seat_id = seat.id
        and hold.status = 'active'
        and hold.expires_at > now()
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
    row_number() over (
      partition by m.id, sector.id
      order by seat.row_label::integer nulls last, seat.seat_number
    ) as row_sort_order
  from public.matches m
  join public.stadium_sectors sector on sector.stadium_id = m.stadium_id
  join public.seats seat on seat.sector_id = sector.id
  left join public.match_sector_overrides override
    on override.match_id = m.id
   and override.sector_id = sector.id
  left join public.gates gate on gate.id = seat.gate_id
  where m.id = p_match_id;
$$;
