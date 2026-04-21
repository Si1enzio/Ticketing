alter table public.stadium_sectors
add column if not exists gate_id uuid references public.gates(id) on delete set null;

create index if not exists stadium_sectors_gate_id_idx
on public.stadium_sectors (gate_id);

update public.stadium_sectors sector
set gate_id = gate_source.gate_id
from (
  select distinct on (seat.sector_id)
    seat.sector_id,
    seat.gate_id
  from public.seats seat
  where seat.gate_id is not null
  order by seat.sector_id, seat.created_at asc
) as gate_source
where sector.id = gate_source.sector_id
  and sector.gate_id is null;

create or replace function public.generate_sector_seats(
  p_sector_id uuid,
  p_rows_count integer,
  p_seats_per_row integer,
  p_replace_existing boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  row_no integer;
  seat_no integer;
  created_count integer := 0;
  v_sector_gate_id uuid;
begin
  select gate_id
  into v_sector_gate_id
  from public.stadium_sectors
  where id = p_sector_id;

  if p_replace_existing then
    delete from public.seats where sector_id = p_sector_id;
  end if;

  for row_no in 1..p_rows_count loop
    for seat_no in 1..p_seats_per_row loop
      insert into public.seats (
        sector_id,
        row_label,
        seat_number,
        seat_label,
        gate_id
      )
      values (
        p_sector_id,
        row_no::text,
        seat_no,
        row_no::text || '-' || seat_no::text,
        v_sector_gate_id
      )
      on conflict (sector_id, row_label, seat_number) do nothing;

      created_count := created_count + 1;
    end loop;
  end loop;

  return created_count;
end;
$$;

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
  left join public.gates gate on gate.id = coalesce(seat.gate_id, sector.gate_id)
  where m.id = p_match_id;
$$;

drop view if exists public.ticket_delivery_view;

create view public.ticket_delivery_view
with (security_invoker = true)
as
select
  t.id as ticket_id,
  t.reservation_id,
  t.match_id,
  m.stadium_id,
  m.slug as match_slug,
  t.ticket_code,
  t.status as ticket_status,
  t.source,
  t.qr_token_version,
  t.issued_at,
  t.used_at,
  m.title as match_title,
  m.competition_name,
  m.opponent_name,
  m.starts_at,
  stadium.name as stadium_name,
  sector.name as sector_name,
  sector.code as sector_code,
  sector.color as sector_color,
  seat.row_label,
  seat.seat_number,
  seat.seat_label,
  t.user_id,
  gate.name as gate_name,
  p.full_name as purchaser_name,
  p.email as purchaser_email
from public.tickets t
join public.matches m on m.id = t.match_id
join public.seats seat on seat.id = t.seat_id
join public.stadium_sectors sector on sector.id = seat.sector_id
join public.stadiums stadium on stadium.id = m.stadium_id
left join public.gates gate on gate.id = coalesce(t.gate_id, seat.gate_id, sector.gate_id)
left join public.profiles p on p.id = t.user_id;
