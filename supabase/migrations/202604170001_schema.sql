create extension if not exists pgcrypto;

create type public.app_role as enum ('guest', 'user', 'steward', 'admin', 'superadmin');
create type public.match_status as enum ('draft', 'published', 'closed', 'completed', 'canceled');
create type public.reservation_status as enum ('pending', 'confirmed', 'expired', 'canceled');
create type public.hold_status as enum ('active', 'expired', 'confirmed', 'released');
create type public.ticket_status as enum ('active', 'used', 'canceled', 'blocked');
create type public.reservation_source as enum (
  'public_reservation',
  'admin_reservation',
  'complimentary',
  'sponsor',
  'media',
  'vip',
  'staff'
);
create type public.scan_result as enum (
  'valid',
  'already_used',
  'invalid_token',
  'wrong_match',
  'canceled',
  'blocked',
  'not_found'
);
create type public.user_block_type as enum ('warning', 'block', 'temp_ban');
create type public.abuse_flag_status as enum ('open', 'reviewed', 'resolved');

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  phone text,
  avatar_url text,
  supporter_code text unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.stadiums (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  club_name text,
  city text not null,
  description text,
  hero_image_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gates (
  id uuid primary key default gen_random_uuid(),
  stadium_id uuid not null references public.stadiums(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (stadium_id, code)
);

create table public.stadium_sectors (
  id uuid primary key default gen_random_uuid(),
  stadium_id uuid not null references public.stadiums(id) on delete cascade,
  name text not null,
  code text not null,
  color text not null default '#11552d',
  rows_count integer not null default 0,
  seats_per_row integer not null default 0,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (stadium_id, code)
);

create table public.seats (
  id uuid primary key default gen_random_uuid(),
  sector_id uuid not null references public.stadium_sectors(id) on delete cascade,
  row_label text not null,
  seat_number integer not null,
  seat_label text not null,
  gate_id uuid references public.gates(id) on delete set null,
  is_disabled boolean not null default false,
  is_obstructed boolean not null default false,
  is_internal_only boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sector_id, row_label, seat_number)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  stadium_id uuid not null references public.stadiums(id) on delete restrict,
  title text not null,
  slug text not null unique,
  competition_name text not null,
  opponent_name text not null,
  description text,
  starts_at timestamptz not null,
  poster_url text,
  banner_url text,
  status public.match_status not null default 'draft',
  scanner_enabled boolean not null default false,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.match_settings (
  match_id uuid primary key references public.matches(id) on delete cascade,
  max_tickets_per_user integer not null default 4,
  opens_at timestamptz,
  closes_at timestamptz,
  hold_minutes integer not null default 10,
  visibility text not null default 'public',
  sector_override_mode text not null default 'inherit',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.match_sector_overrides (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sector_id uuid not null references public.stadium_sectors(id) on delete cascade,
  is_enabled boolean not null default true,
  max_capacity_override integer,
  note text,
  created_at timestamptz not null default now(),
  unique (match_id, sector_id)
);

create table public.seat_holds (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  seat_id uuid not null references public.seats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  hold_token uuid not null,
  gate_id uuid references public.gates(id) on delete set null,
  status public.hold_status not null default 'active',
  expires_at timestamptz not null,
  released_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  status public.reservation_status not null default 'pending',
  source public.reservation_source not null default 'public_reservation',
  total_tickets integer not null default 0,
  reserved_at timestamptz not null default now(),
  confirmed_at timestamptz,
  expires_at timestamptz,
  hold_token uuid,
  admin_note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reservation_items (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  seat_id uuid not null references public.seats(id) on delete restrict,
  gate_id uuid references public.gates(id) on delete set null,
  status public.reservation_status not null default 'confirmed',
  created_at timestamptz not null default now(),
  unique (reservation_id, seat_id)
);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  reservation_item_id uuid not null unique references public.reservation_items(id) on delete cascade,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  seat_id uuid not null references public.seats(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  gate_id uuid references public.gates(id) on delete set null,
  ticket_code text not null unique,
  qr_token_version integer not null default 1,
  status public.ticket_status not null default 'active',
  source public.reservation_source not null default 'public_reservation',
  issued_at timestamptz not null default now(),
  used_at timestamptz,
  canceled_at timestamptz,
  blocked_reason text,
  reissued_count integer not null default 0,
  last_scan_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ticket_scans (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.tickets(id) on delete set null,
  match_id uuid not null references public.matches(id) on delete cascade,
  steward_user_id uuid references auth.users(id) on delete set null,
  gate_id uuid references public.gates(id) on delete set null,
  scanned_at timestamptz not null default now(),
  result public.scan_result not null,
  device_label text,
  token_fingerprint text,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.tickets
  add constraint tickets_last_scan_id_fkey
  foreign key (last_scan_id) references public.ticket_scans(id) on delete set null;

create table public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.user_block_type not null,
  reason text not null,
  note text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.abuse_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id uuid references public.matches(id) on delete set null,
  score numeric(5,2) not null default 0,
  reason_code text not null,
  details jsonb not null default '{}'::jsonb,
  status public.abuse_flag_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  note_type text not null default 'internal',
  content text not null,
  visibility text not null default 'internal',
  created_at timestamptz not null default now()
);

create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sector_id uuid references public.stadium_sectors(id) on delete set null,
  seats_requested integer not null default 1,
  status text not null default 'waiting',
  created_at timestamptz not null default now()
);

create index matches_status_starts_at_idx on public.matches (status, starts_at);
create index seat_holds_match_user_idx on public.seat_holds (match_id, user_id);
create index seat_holds_expiry_idx on public.seat_holds (expires_at);
create index reservations_match_user_idx on public.reservations (match_id, user_id);
create index tickets_match_user_idx on public.tickets (match_id, user_id);
create index tickets_ticket_code_idx on public.tickets (ticket_code);
create index ticket_scans_match_result_idx on public.ticket_scans (match_id, result, scanned_at desc);
create index user_blocks_user_active_idx on public.user_blocks (user_id, is_active, ends_at);
create index abuse_flags_user_status_idx on public.abuse_flags (user_id, status);

create unique index seat_holds_active_match_seat_uidx
  on public.seat_holds (match_id, seat_id)
  where status = 'active';

create unique index tickets_active_match_seat_uidx
  on public.tickets (match_id, seat_id)
  where status in ('active', 'used', 'blocked');

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger stadiums_touch_updated_at
before update on public.stadiums
for each row execute function public.touch_updated_at();

create trigger stadium_sectors_touch_updated_at
before update on public.stadium_sectors
for each row execute function public.touch_updated_at();

create trigger seats_touch_updated_at
before update on public.seats
for each row execute function public.touch_updated_at();

create trigger matches_touch_updated_at
before update on public.matches
for each row execute function public.touch_updated_at();

create trigger match_settings_touch_updated_at
before update on public.match_settings
for each row execute function public.touch_updated_at();

create trigger reservations_touch_updated_at
before update on public.reservations
for each row execute function public.touch_updated_at();

create trigger tickets_touch_updated_at
before update on public.tickets
for each row execute function public.touch_updated_at();

create or replace function public.user_has_role(p_role public.app_role, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.user_roles
    where user_id = coalesce(p_user_id, auth.uid())
      and role = p_role
  );
$$;

create or replace function public.user_has_any_role(p_roles public.app_role[], p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.user_roles
    where user_id = coalesce(p_user_id, auth.uid())
      and role = any (p_roles)
  );
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(public.profiles.full_name, excluded.full_name);

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();
