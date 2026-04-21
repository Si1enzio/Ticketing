create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists teams_name_key on public.teams (name);
create index if not exists teams_slug_idx on public.teams (slug);

alter table public.teams enable row level security;

create policy teams_public_read
on public.teams
for select
using (true);

create policy teams_admin_manage
on public.teams
for all
using (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]))
with check (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]));

insert into public.teams (name, slug)
select distinct
  source.name,
  lower(regexp_replace(trim(source.name), '[^a-zA-Z0-9]+', '-', 'g')) as slug
from (
  select club_name as name
  from public.stadiums
  where club_name is not null
    and trim(club_name) <> ''

  union

  select opponent_name as name
  from public.matches
  where opponent_name is not null
    and trim(opponent_name) <> ''

  union

  select case
    when opponent_name is not null
      and trim(opponent_name) <> ''
      and title like '%' || ' vs ' || opponent_name
    then left(title, char_length(title) - char_length(opponent_name) - 4)
    else null
  end as name
  from public.matches
) as source
where source.name is not null
  and trim(source.name) <> ''
on conflict (slug) do update
set
  name = excluded.name,
  updated_at = now();
