create or replace function public.generate_ticket_code()
returns text
language plpgsql
set search_path = public
as $$
declare
  candidate text;
begin
  loop
    candidate := 'ORH-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.tickets where ticket_code = candidate);
  end loop;

  return candidate;
end;
$$;

create or replace function public.cleanup_expired_holds(p_match_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_rows integer;
begin
  update public.seat_holds
  set status = 'expired',
      released_at = now()
  where status = 'active'
    and expires_at <= now()
    and (p_match_id is null or match_id = p_match_id);

  get diagnostics updated_rows = row_count;
  return updated_rows;
end;
$$;

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
begin
  if p_replace_existing then
    delete from public.seats where sector_id = p_sector_id;
  end if;

  for row_no in 1..p_rows_count loop
    for seat_no in 1..p_seats_per_row loop
      insert into public.seats (
        sector_id,
        row_label,
        seat_number,
        seat_label
      )
      values (
        p_sector_id,
        row_no::text,
        seat_no,
        row_no::text || '-' || seat_no::text
      )
      on conflict (sector_id, row_label, seat_number) do nothing;

      created_count := created_count + 1;
    end loop;
  end loop;

  return created_count;
end;
$$;

create or replace view public.ticket_usage_summary
with (security_invoker = true)
as
select
  m.id as match_id,
  count(t.id) filter (where t.status in ('active', 'used', 'blocked'))::integer as issued_count,
  count(t.id) filter (where t.status = 'used')::integer as scanned_count,
  count(t.id) filter (
    where t.status in ('active', 'blocked')
      and m.starts_at < now()
  )::integer as no_show_count,
  count(ts.id) filter (where ts.result = 'already_used')::integer as duplicate_scan_attempts
from public.matches m
left join public.tickets t on t.match_id = m.id
left join public.ticket_scans ts on ts.match_id = m.id
group by m.id;

create or replace view public.user_abuse_metrics
with (security_invoker = true)
as
select
  p.id as user_id,
  coalesce(p.email, '') as email,
  p.full_name,
  count(t.id)::integer as total_reserved,
  count(t.id) filter (where t.status = 'used')::integer as total_scanned,
  case
    when count(t.id) = 0 then 0::numeric
    else round(
      ((count(t.id) - count(t.id) filter (where t.status = 'used'))::numeric / count(t.id)::numeric),
      2
    )
  end as no_show_ratio,
  least(
    100::numeric,
    round(
      (
        case
          when count(t.id) = 0 then 0::numeric
          else ((count(t.id) - count(t.id) filter (where t.status = 'used'))::numeric / count(t.id)::numeric) * 70
        end
      ) + greatest(count(distinct t.match_id), 0) * 5,
      2
    )
  ) as abuse_score,
  max(b.type::text) filter (
    where b.is_active
      and (b.ends_at is null or b.ends_at > now())
  ) as active_block_type,
  max(b.ends_at) filter (
    where b.is_active
      and (b.ends_at is null or b.ends_at > now())
  ) as active_block_until
from public.profiles p
left join public.tickets t
  on t.user_id = p.id
 and t.source = 'public_reservation'
left join public.user_blocks b
  on b.user_id = p.id
group by p.id, p.email, p.full_name;

create or replace view public.public_match_cards
with (security_invoker = true)
as
select
  m.id,
  m.slug,
  m.title,
  m.competition_name,
  m.opponent_name,
  s.name as stadium_name,
  s.city,
  m.description,
  m.poster_url,
  m.banner_url,
  m.starts_at,
  m.status,
  ms.max_tickets_per_user,
  ms.opens_at as reservation_opens_at,
  ms.closes_at as reservation_closes_at,
  coalesce(tus.issued_count, 0) as issued_count,
  coalesce(tus.scanned_count, 0) as scanned_count,
  greatest(
    (
      select count(*)
      from public.seats seat
      join public.stadium_sectors sector on sector.id = seat.sector_id
      where sector.stadium_id = m.stadium_id
        and seat.is_disabled = false
        and seat.is_obstructed = false
        and seat.is_internal_only = false
    )
    - coalesce(tus.issued_count, 0)
    - (
      select count(*)
      from public.seat_holds hold
      where hold.match_id = m.id
        and hold.status = 'active'
        and hold.expires_at > now()
    ),
    0
  )::integer as available_estimate,
  m.scanner_enabled
from public.matches m
join public.stadiums s on s.id = m.stadium_id
left join public.match_settings ms on ms.match_id = m.id
left join public.ticket_usage_summary tus on tus.match_id = m.id
where m.status in ('published', 'closed', 'completed');

create or replace view public.match_admin_overview
with (security_invoker = true)
as
select
  m.id,
  m.slug,
  m.title,
  m.competition_name,
  m.opponent_name,
  s.name as stadium_name,
  m.starts_at,
  m.status,
  m.scanner_enabled,
  coalesce(ms.max_tickets_per_user, 4) as max_tickets_per_user,
  coalesce(tus.issued_count, 0) as issued_count,
  coalesce(tus.scanned_count, 0) as scanned_count,
  coalesce(tus.no_show_count, 0) as no_show_count,
  coalesce(tus.duplicate_scan_attempts, 0) as duplicate_scan_attempts
from public.matches m
join public.stadiums s on s.id = m.stadium_id
left join public.match_settings ms on ms.match_id = m.id
left join public.ticket_usage_summary tus on tus.match_id = m.id;

create or replace view public.match_seat_status
with (security_invoker = true)
as
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
  (
    select hold.user_id
    from public.seat_holds hold
    where hold.match_id = m.id
      and hold.seat_id = seat.id
      and hold.status = 'active'
      and hold.expires_at > now()
    limit 1
  ) as held_by_user_id,
  seat.gate_id,
  gate.name as gate_name,
  row_number() over (partition by m.id, sector.id order by seat.row_label::integer nulls last, seat.seat_number) as row_sort_order
from public.matches m
join public.stadium_sectors sector on sector.stadium_id = m.stadium_id
join public.seats seat on seat.sector_id = sector.id
left join public.match_sector_overrides override
  on override.match_id = m.id
 and override.sector_id = sector.id
left join public.gates gate on gate.id = coalesce(seat.gate_id, null);

create or replace view public.ticket_delivery_view
with (security_invoker = true)
as
select
  t.id as ticket_id,
  t.reservation_id,
  t.match_id,
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

create or replace view public.admin_user_overview
with (security_invoker = true)
as
select
  p.id as user_id,
  p.email,
  p.full_name,
  coalesce(
    array(
      select ur.role::text
      from public.user_roles ur
      where ur.user_id = p.id
      order by ur.role::text
    ),
    array['user']
  ) as roles,
  coalesce(uam.total_reserved, 0) as total_reserved,
  coalesce(uam.total_scanned, 0) as total_scanned,
  coalesce(uam.no_show_ratio, 0) as no_show_ratio,
  coalesce(uam.abuse_score, 0) as abuse_score,
  uam.active_block_type,
  uam.active_block_until
from public.profiles p
left join public.user_abuse_metrics uam on uam.user_id = p.id;

create or replace function public.sync_abuse_flags_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  metrics record;
begin
  select *
  into metrics
  from public.user_abuse_metrics
  where user_id = p_user_id;

  if not found then
    return;
  end if;

  if coalesce(metrics.abuse_score, 0) >= 30 then
    insert into public.abuse_flags (user_id, score, reason_code, details, status)
    values (
      p_user_id,
      metrics.abuse_score,
      'no_show_pattern',
      jsonb_build_object(
        'total_reserved', metrics.total_reserved,
        'total_scanned', metrics.total_scanned,
        'no_show_ratio', metrics.no_show_ratio
      ),
      'open'
    )
    on conflict do nothing;
  else
    update public.abuse_flags
    set status = 'resolved',
        resolved_at = now()
    where user_id = p_user_id
      and status = 'open';
  end if;
end;
$$;

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
  v_is_privileged boolean := public.user_has_any_role(array['admin', 'superadmin']::public.app_role[]);
  v_is_blocked boolean := false;
  v_expires_at timestamptz;
  v_invalid_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'Autentificare necesară pentru rezervare.';
  end if;

  if v_requested_count = 0 then
    raise exception 'Selectează cel puțin un loc.';
  end if;

  perform public.cleanup_expired_holds(p_match_id);

  select
    coalesce(ms.max_tickets_per_user, 4),
    coalesce(ms.hold_minutes, 10)
  into v_max_tickets, v_hold_minutes
  from public.matches m
  left join public.match_settings ms on ms.match_id = m.id
  where m.id = p_match_id
    and m.status in ('published', 'closed');

  if not found then
    raise exception 'Meciul nu este disponibil pentru rezervare.';
  end if;

  if exists (
    select 1
    from public.match_settings ms
    where ms.match_id = p_match_id
      and ms.opens_at is not null
      and now() < ms.opens_at
  ) then
    raise exception 'Rezervările nu au fost deschise încă.';
  end if;

  if exists (
    select 1
    from public.match_settings ms
    where ms.match_id = p_match_id
      and ms.closes_at is not null
      and now() > ms.closes_at
  ) then
    raise exception 'Rezervările pentru acest meci s-au închis.';
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
    raise exception 'Contul are o restricție activă.';
  end if;

  if not v_is_privileged then
    select count(*)
    into v_existing_count
    from public.tickets
    where user_id = v_user_id
      and match_id = p_match_id
      and status in ('active', 'used', 'blocked');

    if v_existing_count + v_requested_count > v_max_tickets then
      raise exception 'Ai depășit limita de bilete pentru acest meci.';
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
    raise exception 'Unele locuri nu pot fi rezervate.';
  end if;

  select count(*)
  into v_invalid_count
  from unnest(p_seat_ids) as picked(seat_id)
  where exists (
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
    'expires_at', v_expires_at
  );
end;
$$;

create or replace function public.confirm_hold_reservation(
  p_match_id uuid,
  p_hold_token uuid,
  p_source public.reservation_source default 'public_reservation'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_reservation_id uuid;
  v_hold_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'Autentificare necesară.';
  end if;

  perform public.cleanup_expired_holds(p_match_id);

  select count(*)
  into v_hold_count
  from public.seat_holds
  where match_id = p_match_id
    and user_id = v_user_id
    and hold_token = p_hold_token
    and status = 'active'
    and expires_at > now();

  if v_hold_count = 0 then
    raise exception 'Hold-ul nu mai este activ.';
  end if;

  insert into public.reservations (
    match_id,
    user_id,
    status,
    source,
    total_tickets,
    reserved_at,
    confirmed_at,
    hold_token,
    created_by
  )
  values (
    p_match_id,
    v_user_id,
    'confirmed',
    p_source,
    v_hold_count,
    now(),
    now(),
    p_hold_token,
    v_user_id
  )
  returning id into v_reservation_id;

  insert into public.reservation_items (
    reservation_id,
    match_id,
    seat_id,
    gate_id,
    status
  )
  select
    v_reservation_id,
    p_match_id,
    hold.seat_id,
    hold.gate_id,
    'confirmed'
  from public.seat_holds hold
  where hold.match_id = p_match_id
    and hold.user_id = v_user_id
    and hold.hold_token = p_hold_token
    and hold.status = 'active'
    and hold.expires_at > now();

  insert into public.tickets (
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
    created_by
  )
  select
    item.id,
    v_reservation_id,
    item.match_id,
    item.seat_id,
    v_user_id,
    item.gate_id,
    public.generate_ticket_code(),
    1,
    'active',
    p_source,
    now(),
    v_user_id
  from public.reservation_items item
  where item.reservation_id = v_reservation_id;

  update public.seat_holds
  set status = 'confirmed',
      released_at = now()
  where match_id = p_match_id
    and user_id = v_user_id
    and hold_token = p_hold_token
    and status = 'active';

  perform public.sync_abuse_flags_for_user(v_user_id);

  return jsonb_build_object(
    'message', 'Rezervarea a fost confirmată.',
    'reservation_id', v_reservation_id
  );
end;
$$;

create or replace function public.scan_ticket_token(
  p_match_id uuid,
  p_ticket_code text,
  p_token_version integer,
  p_steward_id uuid,
  p_gate_id uuid default null,
  p_device_label text default null,
  p_token_fingerprint text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket record;
  v_scan_id uuid;
  v_scanned_at timestamptz;
begin
  select
    t.id,
    t.user_id,
    t.match_id,
    t.ticket_code,
    t.status,
    t.used_at,
    t.qr_token_version,
    m.title as match_title,
    sector.name as sector_name,
    seat.seat_label
  into v_ticket
  from public.tickets t
  join public.matches m on m.id = t.match_id
  join public.seats seat on seat.id = t.seat_id
  join public.stadium_sectors sector on sector.id = seat.sector_id
  where t.ticket_code = p_ticket_code
  for update;

  if not found then
    insert into public.ticket_scans (ticket_id, match_id, steward_user_id, gate_id, result, device_label, token_fingerprint)
    values (null, p_match_id, p_steward_id, p_gate_id, 'not_found', p_device_label, p_token_fingerprint)
    returning id, scanned_at into v_scan_id, v_scanned_at;

    return jsonb_build_object(
      'result', 'not_found',
      'message', 'Biletul nu există.',
      'ticket_code', p_ticket_code,
      'scanned_at', v_scanned_at
    );
  end if;

  if v_ticket.qr_token_version <> p_token_version then
    insert into public.ticket_scans (ticket_id, match_id, steward_user_id, gate_id, result, device_label, token_fingerprint)
    values (v_ticket.id, p_match_id, p_steward_id, p_gate_id, 'invalid_token', p_device_label, p_token_fingerprint)
    returning id, scanned_at into v_scan_id, v_scanned_at;

    return jsonb_build_object(
      'result', 'invalid_token',
      'message', 'QR-ul a fost reemis și versiunea veche nu mai este validă.',
      'ticket_code', v_ticket.ticket_code,
      'match_title', v_ticket.match_title,
      'sector_label', v_ticket.sector_name,
      'seat_label', v_ticket.seat_label,
      'scanned_at', v_scanned_at
    );
  end if;

  if v_ticket.match_id <> p_match_id then
    insert into public.ticket_scans (ticket_id, match_id, steward_user_id, gate_id, result, device_label, token_fingerprint)
    values (v_ticket.id, p_match_id, p_steward_id, p_gate_id, 'wrong_match', p_device_label, p_token_fingerprint)
    returning id, scanned_at into v_scan_id, v_scanned_at;

    return jsonb_build_object(
      'result', 'wrong_match',
      'message', 'Biletul aparține altui meci.',
      'ticket_code', v_ticket.ticket_code,
      'match_title', v_ticket.match_title,
      'sector_label', v_ticket.sector_name,
      'seat_label', v_ticket.seat_label,
      'scanned_at', v_scanned_at
    );
  end if;

  if v_ticket.status = 'canceled' then
    insert into public.ticket_scans (ticket_id, match_id, steward_user_id, gate_id, result, device_label, token_fingerprint)
    values (v_ticket.id, p_match_id, p_steward_id, p_gate_id, 'canceled', p_device_label, p_token_fingerprint)
    returning id, scanned_at into v_scan_id, v_scanned_at;

    return jsonb_build_object(
      'result', 'canceled',
      'message', 'Biletul este anulat.',
      'ticket_code', v_ticket.ticket_code,
      'match_title', v_ticket.match_title,
      'sector_label', v_ticket.sector_name,
      'seat_label', v_ticket.seat_label,
      'scanned_at', v_scanned_at
    );
  end if;

  if v_ticket.status = 'blocked' then
    insert into public.ticket_scans (ticket_id, match_id, steward_user_id, gate_id, result, device_label, token_fingerprint)
    values (v_ticket.id, p_match_id, p_steward_id, p_gate_id, 'blocked', p_device_label, p_token_fingerprint)
    returning id, scanned_at into v_scan_id, v_scanned_at;

    return jsonb_build_object(
      'result', 'blocked',
      'message', 'Biletul este blocat și nu permite acces.',
      'ticket_code', v_ticket.ticket_code,
      'match_title', v_ticket.match_title,
      'sector_label', v_ticket.sector_name,
      'seat_label', v_ticket.seat_label,
      'scanned_at', v_scanned_at
    );
  end if;

  if v_ticket.used_at is not null or v_ticket.status = 'used' then
    insert into public.ticket_scans (ticket_id, match_id, steward_user_id, gate_id, result, device_label, token_fingerprint)
    values (v_ticket.id, p_match_id, p_steward_id, p_gate_id, 'already_used', p_device_label, p_token_fingerprint)
    returning id, scanned_at into v_scan_id, v_scanned_at;

    return jsonb_build_object(
      'result', 'already_used',
      'message', 'Biletul a fost deja folosit.',
      'ticket_code', v_ticket.ticket_code,
      'match_title', v_ticket.match_title,
      'sector_label', v_ticket.sector_name,
      'seat_label', v_ticket.seat_label,
      'scanned_at', v_scanned_at
    );
  end if;

  update public.tickets
  set status = 'used',
      used_at = now()
  where id = v_ticket.id;

  insert into public.ticket_scans (ticket_id, match_id, steward_user_id, gate_id, result, device_label, token_fingerprint)
  values (v_ticket.id, p_match_id, p_steward_id, p_gate_id, 'valid', p_device_label, p_token_fingerprint)
  returning id, scanned_at into v_scan_id, v_scanned_at;

  update public.tickets
  set last_scan_id = v_scan_id
  where id = v_ticket.id;

  perform public.sync_abuse_flags_for_user(v_ticket.user_id);

  return jsonb_build_object(
    'result', 'valid',
    'message', 'Bilet valid. Acces permis.',
    'ticket_code', v_ticket.ticket_code,
    'match_title', v_ticket.match_title,
    'sector_label', v_ticket.sector_name,
    'seat_label', v_ticket.seat_label,
    'scanned_at', v_scanned_at
  );
end;
$$;

create or replace function public.cancel_ticket_admin(
  p_ticket_id uuid,
  p_reason text,
  p_actor_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tickets
  set status = 'canceled',
      canceled_at = now(),
      blocked_reason = p_reason
  where id = p_ticket_id
    and status <> 'used';

  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action, details)
  values (
    p_actor_id,
    'tickets',
    p_ticket_id::text,
    'cancel_ticket',
    jsonb_build_object('reason', p_reason)
  );
end;
$$;

create or replace function public.reissue_ticket_qr(
  p_ticket_id uuid,
  p_actor_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tickets
  set qr_token_version = qr_token_version + 1,
      reissued_count = reissued_count + 1
  where id = p_ticket_id
    and status = 'active';

  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action, details)
  values (
    p_actor_id,
    'tickets',
    p_ticket_id::text,
    'reissue_ticket_qr',
    jsonb_build_object('reason', 'manual_reissue')
  );
end;
$$;
