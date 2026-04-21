do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'match_seat_override_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.match_seat_override_status as enum ('blocked', 'admin_hold');
  end if;
end $$;

create table if not exists public.match_seat_overrides (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  seat_id uuid not null references public.seats(id) on delete cascade,
  status public.match_seat_override_status not null,
  expires_at timestamptz,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, seat_id)
);

create index if not exists match_seat_overrides_match_status_idx
  on public.match_seat_overrides (match_id, status, expires_at);

create index if not exists match_seat_overrides_seat_idx
  on public.match_seat_overrides (seat_id);

drop trigger if exists match_seat_overrides_touch_updated_at on public.match_seat_overrides;
create trigger match_seat_overrides_touch_updated_at
before update on public.match_seat_overrides
for each row execute function public.touch_updated_at();

alter table public.match_seat_overrides enable row level security;

drop policy if exists match_seat_overrides_admin_read on public.match_seat_overrides;
create policy match_seat_overrides_admin_read
on public.match_seat_overrides
for select
using (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]));

drop policy if exists match_seat_overrides_admin_manage on public.match_seat_overrides;
create policy match_seat_overrides_admin_manage
on public.match_seat_overrides
for all
using (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]))
with check (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]));

create or replace function public.hold_seats(
  p_match_id uuid,
  p_seat_ids uuid[],
  p_gate_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_hold_token uuid := gen_random_uuid();
  v_requested_count integer := coalesce(array_length(p_seat_ids, 1), 0);
  v_existing_count integer := 0;
  v_max_tickets integer := 4;
  v_hold_minutes integer := 10;
  v_ticketing_mode text := 'free';
  v_is_privileged boolean := public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]);
  v_is_blocked boolean := false;
  v_expires_at timestamptz;
  v_invalid_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'Autentificare necesara pentru ticketing.';
  end if;

  if v_requested_count = 0 then
    raise exception 'Selecteaza cel putin un loc.';
  end if;

  perform public.cleanup_expired_holds(p_match_id);

  select
    coalesce(ms.max_tickets_per_user, 4),
    coalesce(ms.hold_minutes, 10),
    coalesce(ms.ticketing_mode, 'free')
  into v_max_tickets, v_hold_minutes, v_ticketing_mode
  from public.matches m
  left join public.match_settings ms on ms.match_id = m.id
  where m.id = p_match_id
    and m.status in ('published', 'closed');

  if not found then
    raise exception 'Meciul nu este disponibil pentru ticketing.';
  end if;

  if exists (
    select 1
    from public.match_settings ms
    where ms.match_id = p_match_id
      and ms.opens_at is not null
      and now() < ms.opens_at
  ) then
    raise exception 'Ticketing-ul nu a fost deschis inca.';
  end if;

  if exists (
    select 1
    from public.match_settings ms
    where ms.match_id = p_match_id
      and ms.closes_at is not null
      and now() > ms.closes_at
  ) then
    raise exception 'Ticketing-ul pentru acest meci s-a incheiat.';
  end if;

  select exists (
    select 1
    from public.user_blocks b
    where b.user_id = v_user_id
      and b.is_active = true
      and (b.ends_at is null or b.ends_at > now())
      and b.type in ('block', 'temp_ban')
  )
  into v_is_blocked;

  if v_is_blocked then
    raise exception 'Contul are o restrictie activa.';
  end if;

  if not v_is_privileged then
    select count(*)
    into v_existing_count
    from public.tickets
    where user_id = v_user_id
      and match_id = p_match_id
      and status in ('active', 'used', 'blocked');

    if v_existing_count + v_requested_count > v_max_tickets then
      raise exception 'Ai depasit limita de bilete pentru acest meci.';
    end if;
  end if;

  select count(*)
  into v_invalid_count
  from unnest(p_seat_ids) as picked(seat_id)
  left join public.seats seat on seat.id = picked.seat_id
  left join public.stadium_sectors sector on sector.id = seat.sector_id
  left join public.matches m on m.id = p_match_id
  left join public.match_sector_overrides override
    on override.match_id = p_match_id
   and override.sector_id = sector.id
  where seat.id is null
     or sector.stadium_id <> m.stadium_id
     or (
       not v_is_privileged
       and (
         seat.is_disabled
         or seat.is_obstructed
         or seat.is_internal_only
         or coalesce(override.is_enabled, true) = false
       )
     );

  if v_invalid_count > 0 then
    raise exception 'Unele locuri nu pot fi alocate.';
  end if;

  select count(*)
  into v_invalid_count
  from unnest(p_seat_ids) as picked(seat_id)
  where exists (
    select 1
    from public.match_seat_overrides override
    where override.match_id = p_match_id
      and override.seat_id = picked.seat_id
      and (
        override.status = 'blocked'
        or (override.status = 'admin_hold' and coalesce(override.expires_at, now() + interval '100 years') > now())
      )
  )
  or exists (
    select 1
    from public.seat_holds hold
    where hold.match_id = p_match_id
      and hold.seat_id = picked.seat_id
      and hold.status = 'active'
      and hold.expires_at > now()
      and hold.user_id <> v_user_id
  )
  or exists (
    select 1
    from public.tickets t
    where t.match_id = p_match_id
      and t.seat_id = picked.seat_id
      and t.status in ('active', 'used', 'blocked')
  );

  if v_invalid_count > 0 then
    raise exception 'Unele locuri nu mai sunt disponibile.';
  end if;

  delete from public.seat_holds
  where match_id = p_match_id
    and user_id = v_user_id
    and status = 'active';

  v_expires_at := now() + make_interval(mins => v_hold_minutes);

  insert into public.seat_holds (
    match_id,
    seat_id,
    user_id,
    hold_token,
    gate_id,
    status,
    expires_at
  )
  select
    p_match_id,
    picked.seat_id,
    v_user_id,
    v_hold_token,
    p_gate_id,
    'active',
    v_expires_at
  from unnest(p_seat_ids) as picked(seat_id);

  return jsonb_build_object(
    'message', 'Locurile au fost blocate temporar.',
    'hold_token', v_hold_token,
    'expires_at', v_expires_at,
    'ticketing_mode', v_ticketing_mode
  );
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
  with active_seat_override as (
    select distinct on (override.match_id, override.seat_id)
      override.match_id,
      override.seat_id,
      override.status,
      override.expires_at
    from public.match_seat_overrides override
    where override.status = 'blocked'
       or (
         override.status = 'admin_hold'
         and coalesce(override.expires_at, now() + interval '100 years') > now()
       )
    order by override.match_id, override.seat_id, override.updated_at desc, override.created_at desc
  )
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
      when coalesce(sector_override.is_enabled, true) = false then 'blocked'
      when active_override.status = 'blocked' then 'blocked'
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
      when active_override.status = 'admin_hold' then 'held'
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
    coalesce(
      active_override.expires_at,
      (
        select max(hold.expires_at)
        from public.seat_holds hold
        where hold.match_id = m.id
          and hold.seat_id = seat.id
          and hold.status = 'active'
          and hold.expires_at > now()
      )
    ) as hold_expires_at,
    (
      active_override.status is null
      and exists (
        select 1
        from public.seat_holds hold
        where hold.match_id = m.id
          and hold.seat_id = seat.id
          and hold.status = 'active'
          and hold.expires_at > now()
          and hold.user_id = auth.uid()
      )
    ) as held_by_current_user,
    gate.name as gate_name,
    row_number() over (
      partition by m.id, sector.id
      order by seat.row_label::integer nulls last, seat.seat_number
    ) as row_sort_order
  from public.matches m
  join public.stadium_sectors sector on sector.stadium_id = m.stadium_id
  join public.seats seat on seat.sector_id = sector.id
  left join public.match_sector_overrides sector_override
    on sector_override.match_id = m.id
   and sector_override.sector_id = sector.id
  left join active_seat_override active_override
    on active_override.match_id = m.id
   and active_override.seat_id = seat.id
  left join public.gates gate on gate.id = seat.gate_id
  where m.id = p_match_id;
$$;
