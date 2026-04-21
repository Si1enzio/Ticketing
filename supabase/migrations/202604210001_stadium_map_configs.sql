create table if not exists public.stadium_map_configs (
  id uuid primary key default gen_random_uuid(),
  stadium_id uuid not null unique references public.stadiums(id) on delete cascade,
  map_key text not null,
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists stadium_map_configs_map_key_uidx
  on public.stadium_map_configs (map_key);

drop trigger if exists stadium_map_configs_touch_updated_at on public.stadium_map_configs;
create trigger stadium_map_configs_touch_updated_at
before update on public.stadium_map_configs
for each row execute procedure public.touch_updated_at();

alter table public.stadium_map_configs enable row level security;

drop policy if exists stadium_map_configs_public_read on public.stadium_map_configs;
create policy stadium_map_configs_public_read
on public.stadium_map_configs
for select
using (is_active = true);

drop policy if exists stadium_map_configs_admin_manage on public.stadium_map_configs;
create policy stadium_map_configs_admin_manage
on public.stadium_map_configs
for all
using (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]))
with check (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]));
