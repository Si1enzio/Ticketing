begin;

-- Seed principal pentru Stadionul Municipal "Orhei".
-- Scriptul este idempotent si poate fi rulat din nou dupa ce creezi conturile demo
-- in Supabase Auth, pentru a primi si roluri / rezervari demo.

insert into public.stadiums (
  name,
  slug,
  club_name,
  city,
  description,
  hero_image_url,
  created_by
)
select
  'Stadionul Municipal "Orhei"',
  'stadionul-municipal-orhei',
  'FC Milsami Orhei',
  'Orhei',
  'Arena demo pentru MVP-ul de ticketing. Structura este pregatita pentru extindere la mai multe stadioane, cluburi si tipuri de evenimente.',
  null,
  (
    select id
    from auth.users
    where email in ('admin.demo@orhei.local', 'superadmin.demo@orhei.local')
    order by email
    limit 1
  )
where not exists (
  select 1
  from public.stadiums
  where slug = 'stadionul-municipal-orhei'
);

update public.stadiums
set
  name = 'Stadionul Municipal "Orhei"',
  club_name = 'FC Milsami Orhei',
  city = 'Orhei',
  description = 'Arena demo pentru MVP-ul de ticketing. Structura este pregatita pentru extindere la mai multe stadioane, cluburi si tipuri de evenimente.'
where slug = 'stadionul-municipal-orhei';

insert into public.gates (stadium_id, name, code, description, sort_order, is_active)
select
  stadium.id,
  gate_data.name,
  gate_data.code,
  gate_data.description,
  gate_data.sort_order,
  true
from public.stadiums stadium
cross join (
  values
    ('Poarta Vest', 'WEST', 'Acces principal pentru tribunele V1 si V2.', 10),
    ('Poarta Est', 'EAST', 'Acces pentru tribuna Est si zona family.', 20),
    ('Poarta Nord', 'NORTH', 'Acces pentru peluza Nord si staff operational.', 30)
) as gate_data(name, code, description, sort_order)
where stadium.slug = 'stadionul-municipal-orhei'
on conflict (stadium_id, code) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.stadium_sectors (
  stadium_id,
  name,
  code,
  color,
  rows_count,
  seats_per_row,
  sort_order,
  metadata
)
select
  stadium.id,
  sector_data.name,
  sector_data.code,
  sector_data.color,
  sector_data.rows_count,
  sector_data.seats_per_row,
  sector_data.sort_order,
  sector_data.metadata::jsonb
from public.stadiums stadium
cross join (
  values
    ('Tribuna Vest A', 'V1', '#2f9e44', 5, 10, 10, '{"side":"west","kind":"main"}'),
    ('Tribuna Vest B', 'V2', '#f08c00', 5, 10, 20, '{"side":"west","kind":"secondary"}'),
    ('Tribuna Est', 'E1', '#1c7ed6', 5, 12, 30, '{"side":"east","kind":"family"}'),
    ('Peluza Nord', 'N', '#364fc7', 4, 14, 40, '{"side":"north","kind":"ultras"}')
) as sector_data(name, code, color, rows_count, seats_per_row, sort_order, metadata)
where stadium.slug = 'stadionul-municipal-orhei'
on conflict (stadium_id, code) do update
set
  name = excluded.name,
  color = excluded.color,
  rows_count = excluded.rows_count,
  seats_per_row = excluded.seats_per_row,
  sort_order = excluded.sort_order,
  metadata = excluded.metadata;

select public.generate_sector_seats(
  sector.id,
  sector.rows_count,
  sector.seats_per_row,
  true
)
from public.stadium_sectors sector
join public.stadiums stadium on stadium.id = sector.stadium_id
where stadium.slug = 'stadionul-municipal-orhei';

update public.seats seat
set gate_id = gate.id
from public.stadium_sectors sector
join public.gates gate on gate.stadium_id = sector.stadium_id
where seat.sector_id = sector.id
  and sector.code in ('V1', 'V2')
  and gate.code = 'WEST';

update public.seats seat
set gate_id = gate.id
from public.stadium_sectors sector
join public.gates gate on gate.stadium_id = sector.stadium_id
where seat.sector_id = sector.id
  and sector.code = 'E1'
  and gate.code = 'EAST';

update public.seats seat
set gate_id = gate.id
from public.stadium_sectors sector
join public.gates gate on gate.stadium_id = sector.stadium_id
where seat.sector_id = sector.id
  and sector.code = 'N'
  and gate.code = 'NORTH';

update public.seats seat
set is_disabled = true
from public.stadium_sectors sector
where seat.sector_id = sector.id
  and sector.code = 'V1'
  and seat.row_label = '1'
  and seat.seat_number in (1, 2);

update public.seats seat
set is_obstructed = true
from public.stadium_sectors sector
where seat.sector_id = sector.id
  and sector.code = 'V2'
  and seat.row_label = '2'
  and seat.seat_number in (9);

update public.seats seat
set is_internal_only = true
from public.stadium_sectors sector
where seat.sector_id = sector.id
  and sector.code = 'E1'
  and seat.row_label = '1'
  and seat.seat_number in (1, 2, 3, 4);

update public.seats seat
set is_disabled = true
from public.stadium_sectors sector
where seat.sector_id = sector.id
  and sector.code = 'N'
  and seat.row_label = '4'
  and seat.seat_number in (14);

insert into public.matches (
  stadium_id,
  title,
  slug,
  competition_name,
  opponent_name,
  description,
  starts_at,
  poster_url,
  banner_url,
  status,
  scanner_enabled,
  published_at,
  created_by,
  updated_by
)
select
  stadium.id,
  match_data.title,
  match_data.slug,
  match_data.competition_name,
  match_data.opponent_name,
  match_data.description,
  match_data.starts_at::timestamptz,
  null,
  null,
  match_data.status::public.match_status,
  match_data.scanner_enabled,
  match_data.published_at::timestamptz,
  (
    select id
    from auth.users
    where email in ('admin.demo@orhei.local', 'superadmin.demo@orhei.local')
    order by email
    limit 1
  ),
  (
    select id
    from auth.users
    where email in ('admin.demo@orhei.local', 'superadmin.demo@orhei.local')
    order by email
    limit 1
  )
from public.stadiums stadium
cross join (
  values
    (
      'FC Milsami Orhei vs FC Zimbru Chisinau',
      'milsami-orhei-fc-zimbru-chisinau',
      'Super Liga Moldovei',
      'FC Zimbru Chisinau',
      'Derby de campionat cu acces gratuit pe baza de rezervare. Biletele sunt nominale si se valideaza exclusiv prin QR.',
      '2026-05-02T16:00:00+03:00',
      'published',
      true,
      '2026-04-18T09:00:00+03:00'
    ),
    (
      'FC Milsami Orhei vs FC Sheriff Tiraspol',
      'milsami-orhei-sheriff-tiraspol',
      'Cupa Moldovei',
      'FC Sheriff Tiraspol',
      'Meci eliminatoriu cu unele zone blocate pentru media, invitati si operational.',
      '2026-05-18T17:30:00+03:00',
      'published',
      false,
      '2026-04-21T09:00:00+03:00'
    ),
    (
      'FC Milsami Orhei vs FC Balti',
      'milsami-orhei-fc-balti',
      'Super Liga Moldovei',
      'FC Balti',
      'Meci deja incheiat, folosit pentru raportari, no-show si demo scanner.',
      '2026-03-22T18:00:00+02:00',
      'completed',
      true,
      '2026-03-10T09:00:00+02:00'
    )
) as match_data(title, slug, competition_name, opponent_name, description, starts_at, status, scanner_enabled, published_at)
where stadium.slug = 'stadionul-municipal-orhei'
on conflict (slug) do update
set
  title = excluded.title,
  competition_name = excluded.competition_name,
  opponent_name = excluded.opponent_name,
  description = excluded.description,
  starts_at = excluded.starts_at,
  status = excluded.status,
  scanner_enabled = excluded.scanner_enabled,
  published_at = excluded.published_at,
  updated_by = excluded.updated_by;

insert into public.match_settings (
  match_id,
  max_tickets_per_user,
  opens_at,
  closes_at,
  hold_minutes,
  visibility,
  sector_override_mode
)
select
  match_row.id,
  settings.max_tickets_per_user,
  settings.opens_at::timestamptz,
  settings.closes_at::timestamptz,
  settings.hold_minutes,
  settings.visibility,
  settings.sector_override_mode
from public.matches match_row
join (
  values
    ('milsami-orhei-fc-zimbru-chisinau', 4, '2026-04-20T08:00:00+03:00', '2026-05-02T13:00:00+03:00', 10, 'public', 'inherit'),
    ('milsami-orhei-sheriff-tiraspol', 4, '2026-05-05T08:00:00+03:00', '2026-05-18T14:30:00+03:00', 12, 'public', 'match_specific'),
    ('milsami-orhei-fc-balti', 4, '2026-03-01T08:00:00+02:00', '2026-03-22T14:00:00+02:00', 10, 'public', 'inherit')
) as settings(slug, max_tickets_per_user, opens_at, closes_at, hold_minutes, visibility, sector_override_mode)
  on settings.slug = match_row.slug
on conflict (match_id) do update
set
  max_tickets_per_user = excluded.max_tickets_per_user,
  opens_at = excluded.opens_at,
  closes_at = excluded.closes_at,
  hold_minutes = excluded.hold_minutes,
  visibility = excluded.visibility,
  sector_override_mode = excluded.sector_override_mode;

insert into public.match_sector_overrides (
  match_id,
  sector_id,
  is_enabled,
  max_capacity_override,
  note
)
select
  match_row.id,
  sector.id,
  override_data.is_enabled,
  override_data.max_capacity_override,
  override_data.note
from public.matches match_row
join public.stadiums stadium on stadium.id = match_row.stadium_id
join public.stadium_sectors sector on sector.stadium_id = stadium.id
join (
  values
    ('milsami-orhei-sheriff-tiraspol', 'N', false, null, 'Peluza Nord este inchisa pentru acest meci.'),
    ('milsami-orhei-sheriff-tiraspol', 'E1', true, 44, 'Tribuna Est ruleaza cu capacitate redusa.')
) as override_data(match_slug, sector_code, is_enabled, max_capacity_override, note)
  on override_data.match_slug = match_row.slug
 and override_data.sector_code = sector.code
on conflict (match_id, sector_id) do update
set
  is_enabled = excluded.is_enabled,
  max_capacity_override = excluded.max_capacity_override,
  note = excluded.note;

-- Daca aceste conturi exista deja in Supabase Auth, seed-ul le promoveaza automat.
update public.profiles set full_name = 'Superadmin Demo' where email = 'superadmin.demo@orhei.local';
update public.profiles set full_name = 'Admin Demo' where email = 'admin.demo@orhei.local';
update public.profiles set full_name = 'Steward Demo' where email = 'steward.demo@orhei.local';
update public.profiles set full_name = 'Supporter Demo' where email = 'supporter.demo@orhei.local';
update public.profiles set full_name = 'Supporter Flagged Demo' where email = 'supporter.flagged@orhei.local';

insert into public.user_roles (user_id, role)
select id, 'superadmin'::public.app_role
from auth.users
where email = 'superadmin.demo@orhei.local'
on conflict do nothing;

insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where email = 'admin.demo@orhei.local'
on conflict do nothing;

insert into public.user_roles (user_id, role)
select id, 'steward'::public.app_role
from auth.users
where email = 'steward.demo@orhei.local'
on conflict do nothing;

insert into public.reservations (
  id,
  match_id,
  user_id,
  status,
  source,
  total_tickets,
  reserved_at,
  confirmed_at,
  expires_at,
  hold_token,
  admin_note,
  created_by
)
select
  '11111111-1111-4111-8111-111111111111'::uuid,
  match_row.id,
  supporter.id,
  'confirmed',
  'public_reservation',
  2,
  '2026-04-18T10:15:00+03:00'::timestamptz,
  '2026-04-18T10:17:00+03:00'::timestamptz,
  null,
  null,
  'Rezervare demo pentru cabinetul personal.',
  supporter.id
from auth.users supporter
join public.matches match_row on match_row.slug = 'milsami-orhei-fc-zimbru-chisinau'
where supporter.email = 'supporter.demo@orhei.local'
  and not exists (
    select 1
    from public.reservations
    where id = '11111111-1111-4111-8111-111111111111'::uuid
  );

insert into public.reservation_items (
  id,
  reservation_id,
  match_id,
  seat_id,
  gate_id,
  status
)
select
  item_data.id,
  '11111111-1111-4111-8111-111111111111'::uuid,
  match_row.id,
  seat.id,
  coalesce(seat.gate_id, gate.id),
  'confirmed'
from public.matches match_row
join public.stadiums stadium on stadium.id = match_row.stadium_id
join public.stadium_sectors sector on sector.stadium_id = stadium.id
join public.gates gate on gate.stadium_id = stadium.id and gate.code = 'WEST'
join (
  values
    ('11111111-1111-4111-8111-111111111112'::uuid, 'V1', '3', 6),
    ('11111111-1111-4111-8111-111111111113'::uuid, 'V1', '3', 7)
) as item_data(id, sector_code, row_label, seat_number)
  on item_data.sector_code = sector.code
join public.seats seat
  on seat.sector_id = sector.id
 and seat.row_label = item_data.row_label
 and seat.seat_number = item_data.seat_number
where match_row.slug = 'milsami-orhei-fc-zimbru-chisinau'
  and exists (
    select 1
    from public.reservations
    where id = '11111111-1111-4111-8111-111111111111'::uuid
  )
  and not exists (
    select 1
    from public.reservation_items
    where id = item_data.id
  );

insert into public.tickets (
  id,
  reservation_item_id,
  reservation_id,
  match_id,
  seat_id,
  user_id,
  gate_id,
  ticket_code,
  qr_token_version,
  status,
  source,
  issued_at,
  used_at,
  created_by
)
select
  ticket_data.ticket_id,
  ticket_data.item_id,
  '11111111-1111-4111-8111-111111111111'::uuid,
  match_row.id,
  item.seat_id,
  supporter.id,
  item.gate_id,
  ticket_data.ticket_code,
  1,
  'active',
  'public_reservation',
  '2026-04-18T10:17:30+03:00'::timestamptz,
  null,
  supporter.id
from auth.users supporter
join public.matches match_row on match_row.slug = 'milsami-orhei-fc-zimbru-chisinau'
join public.reservation_items item
  on item.reservation_id = '11111111-1111-4111-8111-111111111111'::uuid
join (
  values
    ('11111111-1111-4111-8111-111111111114'::uuid, '11111111-1111-4111-8111-111111111112'::uuid, 'ORH-DEMO-A1'),
    ('11111111-1111-4111-8111-111111111115'::uuid, '11111111-1111-4111-8111-111111111113'::uuid, 'ORH-DEMO-A2')
) as ticket_data(ticket_id, item_id, ticket_code)
  on ticket_data.item_id = item.id
where supporter.email = 'supporter.demo@orhei.local'
  and not exists (
    select 1
    from public.tickets
    where id = ticket_data.ticket_id
  );

insert into public.reservations (
  id,
  match_id,
  user_id,
  status,
  source,
  total_tickets,
  reserved_at,
  confirmed_at,
  expires_at,
  hold_token,
  admin_note,
  created_by
)
select
  '22222222-2222-4222-8222-222222222221'::uuid,
  match_row.id,
  supporter.id,
  'confirmed',
  'public_reservation',
  1,
  '2026-03-20T11:00:00+02:00'::timestamptz,
  '2026-03-20T11:03:00+02:00'::timestamptz,
  null,
  null,
  'Istoric demo folosit pentru afisarea biletelor consumate.',
  supporter.id
from auth.users supporter
join public.matches match_row on match_row.slug = 'milsami-orhei-fc-balti'
where supporter.email = 'supporter.demo@orhei.local'
  and not exists (
    select 1
    from public.reservations
    where id = '22222222-2222-4222-8222-222222222221'::uuid
  );

insert into public.reservation_items (
  id,
  reservation_id,
  match_id,
  seat_id,
  gate_id,
  status
)
select
  '22222222-2222-4222-8222-222222222222'::uuid,
  '22222222-2222-4222-8222-222222222221'::uuid,
  match_row.id,
  seat.id,
  coalesce(seat.gate_id, gate.id),
  'confirmed'
from public.matches match_row
join public.stadiums stadium on stadium.id = match_row.stadium_id
join public.stadium_sectors sector on sector.stadium_id = stadium.id and sector.code = 'E1'
join public.gates gate on gate.stadium_id = stadium.id and gate.code = 'EAST'
join public.seats seat on seat.sector_id = sector.id and seat.row_label = '2' and seat.seat_number = 4
where match_row.slug = 'milsami-orhei-fc-balti'
  and exists (
    select 1
    from public.reservations
    where id = '22222222-2222-4222-8222-222222222221'::uuid
  )
  and not exists (
    select 1
    from public.reservation_items
    where id = '22222222-2222-4222-8222-222222222222'::uuid
  );

insert into public.tickets (
  id,
  reservation_item_id,
  reservation_id,
  match_id,
  seat_id,
  user_id,
  gate_id,
  ticket_code,
  qr_token_version,
  status,
  source,
  issued_at,
  used_at,
  created_by
)
select
  '22222222-2222-4222-8222-222222222223'::uuid,
  '22222222-2222-4222-8222-222222222222'::uuid,
  '22222222-2222-4222-8222-222222222221'::uuid,
  match_row.id,
  item.seat_id,
  supporter.id,
  item.gate_id,
  'ORH-DEMO-H1',
  1,
  'used',
  'public_reservation',
  '2026-03-20T11:03:30+02:00'::timestamptz,
  '2026-03-22T17:20:00+02:00'::timestamptz,
  supporter.id
from auth.users supporter
join public.matches match_row on match_row.slug = 'milsami-orhei-fc-balti'
join public.reservation_items item
  on item.id = '22222222-2222-4222-8222-222222222222'::uuid
where supporter.email = 'supporter.demo@orhei.local'
  and not exists (
    select 1
    from public.tickets
    where id = '22222222-2222-4222-8222-222222222223'::uuid
  );

insert into public.reservations (
  id,
  match_id,
  user_id,
  status,
  source,
  total_tickets,
  reserved_at,
  confirmed_at,
  expires_at,
  hold_token,
  admin_note,
  created_by
)
select
  '33333333-3333-4333-8333-333333333331'::uuid,
  match_row.id,
  flagged.id,
  'confirmed',
  'public_reservation',
  5,
  '2026-03-15T14:00:00+02:00'::timestamptz,
  '2026-03-15T14:05:00+02:00'::timestamptz,
  null,
  null,
  'Rezervare demo pentru abuz si no-show.',
  flagged.id
from auth.users flagged
join public.matches match_row on match_row.slug = 'milsami-orhei-fc-balti'
where flagged.email = 'supporter.flagged@orhei.local'
  and not exists (
    select 1
    from public.reservations
    where id = '33333333-3333-4333-8333-333333333331'::uuid
  );

insert into public.reservation_items (
  id,
  reservation_id,
  match_id,
  seat_id,
  gate_id,
  status
)
select
  item_data.id,
  '33333333-3333-4333-8333-333333333331'::uuid,
  match_row.id,
  seat.id,
  coalesce(seat.gate_id, gate.id),
  'confirmed'
from public.matches match_row
join public.stadiums stadium on stadium.id = match_row.stadium_id
join public.stadium_sectors sector on sector.stadium_id = stadium.id and sector.code = 'N'
join public.gates gate on gate.stadium_id = stadium.id and gate.code = 'NORTH'
join (
  values
    ('33333333-3333-4333-8333-333333333332'::uuid, '1', 1),
    ('33333333-3333-4333-8333-333333333333'::uuid, '1', 2),
    ('33333333-3333-4333-8333-333333333334'::uuid, '1', 3),
    ('33333333-3333-4333-8333-333333333335'::uuid, '1', 4),
    ('33333333-3333-4333-8333-333333333336'::uuid, '1', 5)
) as item_data(id, row_label, seat_number)
  on true
join public.seats seat
  on seat.sector_id = sector.id
 and seat.row_label = item_data.row_label
 and seat.seat_number = item_data.seat_number
where match_row.slug = 'milsami-orhei-fc-balti'
  and exists (
    select 1
    from public.reservations
    where id = '33333333-3333-4333-8333-333333333331'::uuid
  )
  and not exists (
    select 1
    from public.reservation_items
    where id = item_data.id
  );

insert into public.tickets (
  id,
  reservation_item_id,
  reservation_id,
  match_id,
  seat_id,
  user_id,
  gate_id,
  ticket_code,
  qr_token_version,
  status,
  source,
  issued_at,
  used_at,
  created_by
)
select
  ticket_data.ticket_id,
  ticket_data.item_id,
  '33333333-3333-4333-8333-333333333331'::uuid,
  match_row.id,
  item.seat_id,
  flagged.id,
  item.gate_id,
  ticket_data.ticket_code,
  1,
  ticket_data.status::public.ticket_status,
  'public_reservation',
  '2026-03-15T14:05:30+02:00'::timestamptz,
  ticket_data.used_at::timestamptz,
  flagged.id
from auth.users flagged
join public.matches match_row on match_row.slug = 'milsami-orhei-fc-balti'
join public.reservation_items item
  on item.reservation_id = '33333333-3333-4333-8333-333333333331'::uuid
join (
  values
    ('33333333-3333-4333-8333-333333333341'::uuid, '33333333-3333-4333-8333-333333333332'::uuid, 'ORH-FLAG-01', 'used', '2026-03-22T17:10:00+02:00'),
    ('33333333-3333-4333-8333-333333333342'::uuid, '33333333-3333-4333-8333-333333333333'::uuid, 'ORH-FLAG-02', 'active', null),
    ('33333333-3333-4333-8333-333333333343'::uuid, '33333333-3333-4333-8333-333333333334'::uuid, 'ORH-FLAG-03', 'active', null),
    ('33333333-3333-4333-8333-333333333344'::uuid, '33333333-3333-4333-8333-333333333335'::uuid, 'ORH-FLAG-04', 'active', null),
    ('33333333-3333-4333-8333-333333333345'::uuid, '33333333-3333-4333-8333-333333333336'::uuid, 'ORH-FLAG-05', 'active', null)
) as ticket_data(ticket_id, item_id, ticket_code, status, used_at)
  on ticket_data.item_id = item.id
where flagged.email = 'supporter.flagged@orhei.local'
  and not exists (
    select 1
    from public.tickets
    where id = ticket_data.ticket_id
  );

insert into public.ticket_scans (
  id,
  ticket_id,
  match_id,
  steward_user_id,
  gate_id,
  scanned_at,
  result,
  device_label,
  token_fingerprint,
  metadata
)
select
  scan_data.id,
  scan_data.ticket_id,
  match_row.id,
  steward.id,
  gate.id,
  scan_data.scanned_at::timestamptz,
  scan_data.result::public.scan_result,
  scan_data.device_label,
  scan_data.token_fingerprint,
  scan_data.metadata::jsonb
from public.matches match_row
join public.stadiums stadium on stadium.id = match_row.stadium_id
join public.gates gate on gate.stadium_id = stadium.id and gate.code = 'NORTH'
join auth.users steward on steward.email = 'steward.demo@orhei.local'
join (
  values
    (
      '44444444-4444-4444-8444-444444444441'::uuid,
      '33333333-3333-4333-8333-333333333341'::uuid,
      '2026-03-22T17:10:00+02:00',
      'valid',
      'Samsung A54 / Poarta Nord',
      'FLAGUSED001',
      '{"source":"seed","lane":"N1"}'
    ),
    (
      '44444444-4444-4444-8444-444444444442'::uuid,
      '33333333-3333-4333-8333-333333333341'::uuid,
      '2026-03-22T17:11:30+02:00',
      'already_used',
      'Samsung A54 / Poarta Nord',
      'FLAGUSED001',
      '{"source":"seed","lane":"N1","repeat":true}'
    )
) as scan_data(id, ticket_id, scanned_at, result, device_label, token_fingerprint, metadata)
  on true
where match_row.slug = 'milsami-orhei-fc-balti'
  and not exists (
    select 1
    from public.ticket_scans
    where id = scan_data.id
  );

update public.tickets
set last_scan_id = '44444444-4444-4444-8444-444444444441'::uuid
where id = '33333333-3333-4333-8333-333333333341'::uuid;

insert into public.user_blocks (
  id,
  user_id,
  type,
  reason,
  note,
  starts_at,
  ends_at,
  is_active,
  created_by
)
select
  '55555555-5555-4555-8555-555555555551'::uuid,
  flagged.id,
  'temp_ban',
  'Pattern repetat de no-show la meciurile gratuite.',
  'Blocare demo pentru panoul de moderare.',
  now() - interval '2 day',
  now() + interval '5 day',
  true,
  (
    select id
    from auth.users
    where email in ('admin.demo@orhei.local', 'superadmin.demo@orhei.local')
    order by email
    limit 1
  )
from auth.users flagged
where flagged.email = 'supporter.flagged@orhei.local'
  and not exists (
    select 1
    from public.user_blocks
    where id = '55555555-5555-4555-8555-555555555551'::uuid
  );

insert into public.admin_notes (
  id,
  user_id,
  author_user_id,
  note_type,
  content,
  visibility
)
select
  '66666666-6666-4666-8666-666666666661'::uuid,
  flagged.id,
  (
    select id
    from auth.users
    where email in ('admin.demo@orhei.local', 'superadmin.demo@orhei.local')
    order by email
    limit 1
  ),
  'risk',
  'Utilizator marcat automat pe baza raportului no-show si blocat temporar pentru verificare manuala.',
  'internal'
from auth.users flagged
where flagged.email = 'supporter.flagged@orhei.local'
  and not exists (
    select 1
    from public.admin_notes
    where id = '66666666-6666-4666-8666-666666666661'::uuid
  );

do $$
declare
  flagged_user_id uuid;
begin
  select id
  into flagged_user_id
  from auth.users
  where email = 'supporter.flagged@orhei.local'
  limit 1;

  if flagged_user_id is not null then
    perform public.sync_abuse_flags_for_user(flagged_user_id);
  end if;
end;
$$;

commit;
