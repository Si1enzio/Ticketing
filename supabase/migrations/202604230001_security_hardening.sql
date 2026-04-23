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
  if auth.uid() is null
    or not public.user_has_any_role(array['admin', 'superadmin']::public.app_role[])
  then
    raise exception 'Acces interzis pentru generarea locurilor.';
  end if;

  if p_rows_count < 1 or p_rows_count > 500 or p_seats_per_row < 1 or p_seats_per_row > 500 then
    raise exception 'Configuratia locurilor depaseste limitele permise.';
  end if;

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
  if auth.uid() is null
    or auth.uid() <> p_actor_id
    or not public.user_has_any_role(array['admin', 'superadmin']::public.app_role[])
  then
    raise exception 'Acces interzis pentru anularea biletului.';
  end if;

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
  if auth.uid() is null
    or auth.uid() <> p_actor_id
    or not public.user_has_any_role(array['admin', 'superadmin']::public.app_role[])
  then
    raise exception 'Acces interzis pentru reemiterea QR-ului.';
  end if;

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
  v_holder_name text;
  v_holder_birth_date date;
  v_scan_id uuid;
  v_scanned_at timestamptz;
begin
  if auth.uid() is null
    or auth.uid() <> p_steward_id
    or not public.user_has_any_role(array['steward', 'admin', 'superadmin']::public.app_role[])
  then
    raise exception 'Acces interzis pentru scanarea biletelor.';
  end if;

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
  for update of t;

  if not found then
    insert into public.ticket_scans (ticket_id, match_id, steward_user_id, gate_id, result, device_label, token_fingerprint)
    values (null, p_match_id, p_steward_id, p_gate_id, 'not_found', p_device_label, p_token_fingerprint)
    returning id, scanned_at into v_scan_id, v_scanned_at;

    return jsonb_build_object(
      'result', 'not_found',
      'message', 'Biletul nu exista.',
      'ticket_code', p_ticket_code,
      'scanned_at', v_scanned_at,
      'credential_kind', 'ticket'
    );
  end if;

  select profile.full_name, profile.birth_date
  into v_holder_name, v_holder_birth_date
  from public.profiles profile
  where profile.id = v_ticket.user_id;

  if v_ticket.qr_token_version <> p_token_version then
    insert into public.ticket_scans (ticket_id, match_id, steward_user_id, gate_id, result, device_label, token_fingerprint)
    values (v_ticket.id, p_match_id, p_steward_id, p_gate_id, 'invalid_token', p_device_label, p_token_fingerprint)
    returning id, scanned_at into v_scan_id, v_scanned_at;

    return jsonb_build_object(
      'result', 'invalid_token',
      'message', 'QR-ul a fost reemis si versiunea veche nu mai este valida.',
      'ticket_code', v_ticket.ticket_code,
      'match_title', v_ticket.match_title,
      'sector_label', v_ticket.sector_name,
      'seat_label', v_ticket.seat_label,
      'scanned_at', v_scanned_at,
      'holder_name', v_holder_name,
      'holder_birth_date', v_holder_birth_date,
      'credential_kind', 'ticket'
    );
  end if;

  if v_ticket.match_id <> p_match_id then
    insert into public.ticket_scans (ticket_id, match_id, steward_user_id, gate_id, result, device_label, token_fingerprint)
    values (v_ticket.id, p_match_id, p_steward_id, p_gate_id, 'wrong_match', p_device_label, p_token_fingerprint)
    returning id, scanned_at into v_scan_id, v_scanned_at;

    return jsonb_build_object(
      'result', 'wrong_match',
      'message', 'Biletul apartine altui meci.',
      'ticket_code', v_ticket.ticket_code,
      'match_title', v_ticket.match_title,
      'sector_label', v_ticket.sector_name,
      'seat_label', v_ticket.seat_label,
      'scanned_at', v_scanned_at,
      'holder_name', v_holder_name,
      'holder_birth_date', v_holder_birth_date,
      'credential_kind', 'ticket'
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
      'scanned_at', v_scanned_at,
      'holder_name', v_holder_name,
      'holder_birth_date', v_holder_birth_date,
      'credential_kind', 'ticket'
    );
  end if;

  if v_ticket.status = 'blocked' then
    insert into public.ticket_scans (ticket_id, match_id, steward_user_id, gate_id, result, device_label, token_fingerprint)
    values (v_ticket.id, p_match_id, p_steward_id, p_gate_id, 'blocked', p_device_label, p_token_fingerprint)
    returning id, scanned_at into v_scan_id, v_scanned_at;

    return jsonb_build_object(
      'result', 'blocked',
      'message', 'Biletul este blocat si nu permite acces.',
      'ticket_code', v_ticket.ticket_code,
      'match_title', v_ticket.match_title,
      'sector_label', v_ticket.sector_name,
      'seat_label', v_ticket.seat_label,
      'scanned_at', v_scanned_at,
      'holder_name', v_holder_name,
      'holder_birth_date', v_holder_birth_date,
      'credential_kind', 'ticket'
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
      'scanned_at', v_scanned_at,
      'holder_name', v_holder_name,
      'holder_birth_date', v_holder_birth_date,
      'credential_kind', 'ticket'
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
    'scanned_at', v_scanned_at,
    'holder_name', v_holder_name,
    'holder_birth_date', v_holder_birth_date,
    'credential_kind', 'ticket'
  );
end;
$$;

create or replace function public.scan_subscription_token(
  p_match_id uuid,
  p_subscription_code text,
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
  v_subscription record;
  v_holder_name text;
  v_holder_birth_date date;
  v_seat_label text;
  v_sector_name text;
  v_scan_id uuid;
  v_scanned_at timestamptz;
begin
  if auth.uid() is null
    or auth.uid() <> p_steward_id
    or not public.user_has_any_role(array['steward', 'admin', 'superadmin']::public.app_role[])
  then
    raise exception 'Acces interzis pentru scanarea abonamentelor.';
  end if;

  select
    us.id,
    us.user_id,
    us.status,
    us.starts_at,
    us.ends_at,
    us.subscription_code,
    us.qr_token_version,
    us.stadium_id,
    us.gate_id,
    m.title as match_title,
    m.starts_at as match_starts_at,
    m.stadium_id as match_stadium_id
  into v_subscription
  from public.user_subscriptions us
  join public.matches m on m.id = p_match_id
  where us.subscription_code = p_subscription_code
  for update of us;

  if not found then
    insert into public.subscription_scans (
      subscription_id,
      match_id,
      steward_user_id,
      gate_id,
      result,
      device_label,
      token_fingerprint
    )
    values (
      null,
      p_match_id,
      p_steward_id,
      p_gate_id,
      'not_found',
      p_device_label,
      p_token_fingerprint
    )
    returning id, scanned_at into v_scan_id, v_scanned_at;

    return jsonb_build_object(
      'result', 'not_found',
      'message', 'Abonamentul nu exista.',
      'ticket_code', p_subscription_code,
      'scanned_at', v_scanned_at,
      'credential_kind', 'subscription'
    );
  end if;

  select profile.full_name, profile.birth_date
  into v_holder_name, v_holder_birth_date
  from public.profiles profile
  where profile.id = v_subscription.user_id;

  select
    sector.name,
    seat.seat_label
  into v_sector_name, v_seat_label
  from public.seats seat
  join public.stadium_sectors sector on sector.id = seat.sector_id
  where seat.id = (
    select us2.seat_id
    from public.user_subscriptions us2
    where us2.id = v_subscription.id
  );

  if v_subscription.qr_token_version <> p_token_version then
    insert into public.subscription_scans (
      subscription_id,
      match_id,
      steward_user_id,
      gate_id,
      result,
      device_label,
      token_fingerprint
    )
    values (
      v_subscription.id,
      p_match_id,
      p_steward_id,
      p_gate_id,
      'invalid_token',
      p_device_label,
      p_token_fingerprint
    )
    returning id, scanned_at into v_scan_id, v_scanned_at;

    return jsonb_build_object(
      'result', 'invalid_token',
      'message', 'Abonamentul a fost reemis si versiunea veche nu mai este valida.',
      'ticket_code', v_subscription.subscription_code,
      'match_title', v_subscription.match_title,
      'sector_label', v_sector_name,
      'seat_label', v_seat_label,
      'scanned_at', v_scanned_at,
      'holder_name', v_holder_name,
      'holder_birth_date', v_holder_birth_date,
      'credential_kind', 'subscription'
    );
  end if;

  if v_subscription.match_stadium_id <> v_subscription.stadium_id then
    insert into public.subscription_scans (
      subscription_id,
      match_id,
      steward_user_id,
      gate_id,
      result,
      device_label,
      token_fingerprint
    )
    values (
      v_subscription.id,
      p_match_id,
      p_steward_id,
      p_gate_id,
      'wrong_match',
      p_device_label,
      p_token_fingerprint
    )
    returning id, scanned_at into v_scan_id, v_scanned_at;

    return jsonb_build_object(
      'result', 'wrong_match',
      'message', 'Abonamentul nu este valabil pentru stadionul acestui meci.',
      'ticket_code', v_subscription.subscription_code,
      'match_title', v_subscription.match_title,
      'sector_label', v_sector_name,
      'seat_label', v_seat_label,
      'scanned_at', v_scanned_at,
      'holder_name', v_holder_name,
      'holder_birth_date', v_holder_birth_date,
      'credential_kind', 'subscription'
    );
  end if;

  if v_subscription.status <> 'active' then
    insert into public.subscription_scans (
      subscription_id,
      match_id,
      steward_user_id,
      gate_id,
      result,
      device_label,
      token_fingerprint
    )
    values (
      v_subscription.id,
      p_match_id,
      p_steward_id,
      p_gate_id,
      'blocked',
      p_device_label,
      p_token_fingerprint
    )
    returning id, scanned_at into v_scan_id, v_scanned_at;

    return jsonb_build_object(
      'result', 'blocked',
      'message', 'Abonamentul nu este activ.',
      'ticket_code', v_subscription.subscription_code,
      'match_title', v_subscription.match_title,
      'sector_label', v_sector_name,
      'seat_label', v_seat_label,
      'scanned_at', v_scanned_at,
      'holder_name', v_holder_name,
      'holder_birth_date', v_holder_birth_date,
      'credential_kind', 'subscription'
    );
  end if;

  if now() < v_subscription.starts_at or now() > v_subscription.ends_at then
    insert into public.subscription_scans (
      subscription_id,
      match_id,
      steward_user_id,
      gate_id,
      result,
      device_label,
      token_fingerprint
    )
    values (
      v_subscription.id,
      p_match_id,
      p_steward_id,
      p_gate_id,
      'blocked',
      p_device_label,
      p_token_fingerprint
    )
    returning id, scanned_at into v_scan_id, v_scanned_at;

    return jsonb_build_object(
      'result', 'blocked',
      'message', 'Abonamentul nu este valabil in aceasta perioada.',
      'ticket_code', v_subscription.subscription_code,
      'match_title', v_subscription.match_title,
      'sector_label', v_sector_name,
      'seat_label', v_seat_label,
      'scanned_at', v_scanned_at,
      'holder_name', v_holder_name,
      'holder_birth_date', v_holder_birth_date,
      'credential_kind', 'subscription'
    );
  end if;

  if exists (
    select 1
    from public.subscription_scans scan
    where scan.subscription_id = v_subscription.id
      and scan.match_id = p_match_id
      and scan.result = 'valid'
  ) then
    insert into public.subscription_scans (
      subscription_id,
      match_id,
      steward_user_id,
      gate_id,
      result,
      device_label,
      token_fingerprint
    )
    values (
      v_subscription.id,
      p_match_id,
      p_steward_id,
      p_gate_id,
      'already_used',
      p_device_label,
      p_token_fingerprint
    )
    returning id, scanned_at into v_scan_id, v_scanned_at;

    return jsonb_build_object(
      'result', 'already_used',
      'message', 'Abonamentul a fost deja folosit pentru acest meci.',
      'ticket_code', v_subscription.subscription_code,
      'match_title', v_subscription.match_title,
      'sector_label', v_sector_name,
      'seat_label', v_seat_label,
      'scanned_at', v_scanned_at,
      'holder_name', v_holder_name,
      'holder_birth_date', v_holder_birth_date,
      'credential_kind', 'subscription'
    );
  end if;

  insert into public.subscription_scans (
    subscription_id,
    match_id,
    steward_user_id,
    gate_id,
    result,
    device_label,
    token_fingerprint
  )
  values (
    v_subscription.id,
    p_match_id,
    p_steward_id,
    p_gate_id,
    'valid',
    p_device_label,
    p_token_fingerprint
  )
  returning id, scanned_at into v_scan_id, v_scanned_at;

  perform public.sync_abuse_flags_for_user(v_subscription.user_id);

  return jsonb_build_object(
    'result', 'valid',
    'message', 'Abonament valid. Acces permis.',
    'ticket_code', v_subscription.subscription_code,
    'match_title', v_subscription.match_title,
    'sector_label', v_sector_name,
    'seat_label', v_seat_label,
    'scanned_at', v_scanned_at,
    'holder_name', v_holder_name,
    'holder_birth_date', v_holder_birth_date,
    'credential_kind', 'subscription'
  );
end;
$$;

revoke execute on function public.generate_sector_seats(uuid, integer, integer, boolean) from public, anon;
revoke execute on function public.cancel_ticket_admin(uuid, text, uuid) from public, anon;
revoke execute on function public.reissue_ticket_qr(uuid, uuid) from public, anon;
revoke execute on function public.hold_seats(uuid, uuid[], uuid) from public, anon;
revoke execute on function public.confirm_hold_reservation(uuid, uuid, public.reservation_source) from public, anon;
revoke execute on function public.complete_demo_payment(uuid, uuid) from public, anon;
revoke execute on function public.update_profile_self(text, text, text, text, text, date, public.profile_gender, text, boolean, boolean) from public, anon;
revoke execute on function public.scan_ticket_token(uuid, text, integer, uuid, uuid, text, text) from public, anon;
revoke execute on function public.scan_subscription_token(uuid, text, integer, uuid, uuid, text, text) from public, anon;
revoke execute on function public.admin_delete_match_cascade(uuid) from public, anon;

grant execute on function public.generate_sector_seats(uuid, integer, integer, boolean) to authenticated, service_role;
grant execute on function public.cancel_ticket_admin(uuid, text, uuid) to authenticated, service_role;
grant execute on function public.reissue_ticket_qr(uuid, uuid) to authenticated, service_role;
grant execute on function public.hold_seats(uuid, uuid[], uuid) to authenticated, service_role;
grant execute on function public.confirm_hold_reservation(uuid, uuid, public.reservation_source) to authenticated, service_role;
grant execute on function public.complete_demo_payment(uuid, uuid) to authenticated, service_role;
grant execute on function public.update_profile_self(text, text, text, text, text, date, public.profile_gender, text, boolean, boolean) to authenticated, service_role;
grant execute on function public.scan_ticket_token(uuid, text, integer, uuid, uuid, text, text) to authenticated, service_role;
grant execute on function public.scan_subscription_token(uuid, text, integer, uuid, uuid, text, text) to authenticated, service_role;
grant execute on function public.admin_delete_match_cascade(uuid) to authenticated, service_role;
grant execute on function public.get_match_seat_status(uuid) to anon, authenticated, service_role;
