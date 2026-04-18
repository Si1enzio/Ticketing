alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.stadiums enable row level security;
alter table public.gates enable row level security;
alter table public.stadium_sectors enable row level security;
alter table public.seats enable row level security;
alter table public.matches enable row level security;
alter table public.match_settings enable row level security;
alter table public.match_sector_overrides enable row level security;
alter table public.seat_holds enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_items enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_scans enable row level security;
alter table public.user_blocks enable row level security;
alter table public.abuse_flags enable row level security;
alter table public.audit_logs enable row level security;
alter table public.admin_notes enable row level security;
alter table public.waitlist_entries enable row level security;

create policy profiles_select_own_or_admin
on public.profiles
for select
using (
  auth.uid() = id
  or public.user_has_any_role(array['admin', 'superadmin']::public.app_role[])
);

create policy profiles_update_own_or_admin
on public.profiles
for update
using (
  auth.uid() = id
  or public.user_has_any_role(array['admin', 'superadmin']::public.app_role[])
)
with check (
  auth.uid() = id
  or public.user_has_any_role(array['admin', 'superadmin']::public.app_role[])
);

create policy user_roles_select_own_or_admin
on public.user_roles
for select
using (
  auth.uid() = user_id
  or public.user_has_any_role(array['admin', 'superadmin']::public.app_role[])
);

create policy user_roles_manage_superadmin
on public.user_roles
for all
using (public.user_has_role('superadmin'))
with check (public.user_has_role('superadmin'));

create policy stadiums_public_read
on public.stadiums
for select
using (true);

create policy stadiums_admin_manage
on public.stadiums
for all
using (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]))
with check (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]));

create policy gates_public_read
on public.gates
for select
using (true);

create policy gates_admin_manage
on public.gates
for all
using (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]))
with check (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]));

create policy sectors_public_read
on public.stadium_sectors
for select
using (true);

create policy sectors_admin_manage
on public.stadium_sectors
for all
using (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]))
with check (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]));

create policy seats_public_read
on public.seats
for select
using (true);

create policy seats_admin_manage
on public.seats
for all
using (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]))
with check (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]));

create policy matches_public_read
on public.matches
for select
using (true);

create policy matches_admin_manage
on public.matches
for all
using (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]))
with check (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]));

create policy match_settings_public_read
on public.match_settings
for select
using (true);

create policy match_settings_admin_manage
on public.match_settings
for all
using (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]))
with check (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]));

create policy sector_overrides_public_read
on public.match_sector_overrides
for select
using (true);

create policy sector_overrides_admin_manage
on public.match_sector_overrides
for all
using (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]))
with check (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]));

create policy seat_holds_select_own_or_admin
on public.seat_holds
for select
using (
  auth.uid() = user_id
  or public.user_has_any_role(array['admin', 'superadmin']::public.app_role[])
);

create policy reservations_select_own_or_admin
on public.reservations
for select
using (
  auth.uid() = user_id
  or public.user_has_any_role(array['admin', 'superadmin']::public.app_role[])
);

create policy reservation_items_select_own_or_admin
on public.reservation_items
for select
using (
  exists (
    select 1
    from public.reservations r
    where r.id = reservation_id
      and r.user_id = auth.uid()
  )
  or public.user_has_any_role(array['admin', 'superadmin']::public.app_role[])
);

create policy tickets_select_own_or_admin
on public.tickets
for select
using (
  auth.uid() = user_id
  or public.user_has_any_role(array['admin', 'superadmin']::public.app_role[])
);

create policy ticket_scans_select_steward_or_admin
on public.ticket_scans
for select
using (
  public.user_has_any_role(array['steward', 'admin', 'superadmin']::public.app_role[])
);

create policy user_blocks_select_own_or_admin
on public.user_blocks
for select
using (
  auth.uid() = user_id
  or public.user_has_any_role(array['admin', 'superadmin']::public.app_role[])
);

create policy user_blocks_admin_manage
on public.user_blocks
for all
using (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]))
with check (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]));

create policy abuse_flags_admin_read
on public.abuse_flags
for select
using (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]));

create policy abuse_flags_admin_manage
on public.abuse_flags
for all
using (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]))
with check (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]));

create policy audit_logs_admin_read
on public.audit_logs
for select
using (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]));

create policy audit_logs_admin_insert
on public.audit_logs
for insert
with check (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]));

create policy admin_notes_admin_read
on public.admin_notes
for select
using (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]));

create policy admin_notes_admin_insert
on public.admin_notes
for insert
with check (public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]));

create policy waitlist_select_own_or_admin
on public.waitlist_entries
for select
using (
  auth.uid() = user_id
  or public.user_has_any_role(array['admin', 'superadmin']::public.app_role[])
);

create policy waitlist_user_insert
on public.waitlist_entries
for insert
with check (auth.uid() = user_id);
