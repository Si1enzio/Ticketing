do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'app_role'
      and e.enumlabel = 'organizer_admin'
  ) then
    alter type public.app_role add value 'organizer_admin';
  end if;
end $$;

create table if not exists public.organizers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category text not null default 'club',
  description text,
  logo_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger touch_organizers_updated_at
before update on public.organizers
for each row execute function public.touch_updated_at();

alter table public.stadiums
  add column if not exists organizer_id uuid references public.organizers(id) on delete set null;

alter table public.matches
  add column if not exists organizer_id uuid references public.organizers(id) on delete set null;

create table if not exists public.user_access_scopes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  organizer_id uuid references public.organizers(id) on delete cascade,
  stadium_id uuid references public.stadiums(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_access_scopes_target_required
    check (organizer_id is not null or stadium_id is not null)
);

create unique index if not exists user_access_scopes_unique_scope
  on public.user_access_scopes (
    user_id,
    role,
    coalesce(organizer_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(stadium_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create index if not exists user_access_scopes_user_idx
  on public.user_access_scopes (user_id);

create index if not exists user_access_scopes_organizer_idx
  on public.user_access_scopes (organizer_id);

create index if not exists user_access_scopes_stadium_idx
  on public.user_access_scopes (stadium_id);

create trigger touch_user_access_scopes_updated_at
before update on public.user_access_scopes
for each row execute function public.touch_updated_at();

insert into public.organizers (name, slug, category)
select distinct
  trim(s.club_name),
  regexp_replace(lower(trim(s.club_name)), '[^a-z0-9]+', '-', 'g'),
  'club'
from public.stadiums s
where nullif(trim(s.club_name), '') is not null
on conflict (slug) do nothing;

update public.stadiums s
set organizer_id = o.id
from public.organizers o
where s.organizer_id is null
  and nullif(trim(s.club_name), '') is not null
  and lower(trim(s.club_name)) = lower(o.name);

update public.matches m
set organizer_id = s.organizer_id
from public.stadiums s
where m.organizer_id is null
  and s.id = m.stadium_id
  and s.organizer_id is not null;

alter table public.organizers enable row level security;
alter table public.user_access_scopes enable row level security;

create policy organizers_public_read
on public.organizers
for select
using (true);

create policy organizers_admin_manage
on public.organizers
for all
using (public.user_has_any_role(array['admin', 'superadmin', 'organizer_admin']::public.app_role[]))
with check (public.user_has_any_role(array['admin', 'superadmin', 'organizer_admin']::public.app_role[]));

create policy user_access_scopes_select_own_or_admin
on public.user_access_scopes
for select
using (
  auth.uid() = user_id
  or public.user_has_any_role(array['admin', 'superadmin']::public.app_role[])
);

create policy user_access_scopes_manage_admin
on public.user_access_scopes
for all
using (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]))
with check (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]));
