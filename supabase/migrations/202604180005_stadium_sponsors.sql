create table if not exists public.stadium_sponsors (
  id uuid primary key default gen_random_uuid(),
  stadium_id uuid not null references public.stadiums(id) on delete cascade,
  name text not null,
  logo_url text not null,
  website_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stadium_sponsors_stadium_sort_idx
  on public.stadium_sponsors (stadium_id, sort_order, name);

drop trigger if exists stadium_sponsors_touch_updated_at on public.stadium_sponsors;
create trigger stadium_sponsors_touch_updated_at
before update on public.stadium_sponsors
for each row execute function public.touch_updated_at();

alter table public.stadium_sponsors enable row level security;

drop policy if exists stadium_sponsors_public_read on public.stadium_sponsors;
create policy stadium_sponsors_public_read
on public.stadium_sponsors
for select
using (true);

drop policy if exists stadium_sponsors_admin_manage on public.stadium_sponsors;
create policy stadium_sponsors_admin_manage
on public.stadium_sponsors
for all
using (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]))
with check (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]));

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
left join public.gates gate on gate.id = coalesce(t.gate_id, seat.gate_id)
left join public.profiles p on p.id = t.user_id;
