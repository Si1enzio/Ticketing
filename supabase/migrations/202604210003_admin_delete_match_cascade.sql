create or replace function public.admin_delete_match_cascade(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match record;
  v_deleted_reservations integer := 0;
  v_deleted_tickets integer := 0;
  v_deleted_payments integer := 0;
  v_deleted_scans integer := 0;
  v_deleted_holds integer := 0;
  v_deleted_abuse_flags integer := 0;
begin
  if auth.uid() is null
    or not public.user_has_any_role(array['admin', 'superadmin']::public.app_role[])
  then
    raise exception 'Acces interzis pentru stergerea meciului.';
  end if;

  select id, title
  into v_match
  from public.matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'Meciul nu mai exista.';
  end if;

  select count(*)
  into v_deleted_tickets
  from public.tickets
  where match_id = p_match_id;

  select count(*)
  into v_deleted_reservations
  from public.reservations
  where match_id = p_match_id;

  select count(*)
  into v_deleted_payments
  from public.payments
  where match_id = p_match_id;

  select count(*)
  into v_deleted_scans
  from public.ticket_scans
  where match_id = p_match_id;

  select count(*)
  into v_deleted_holds
  from public.seat_holds
  where match_id = p_match_id;

  select count(*)
  into v_deleted_abuse_flags
  from public.abuse_flags
  where match_id = p_match_id;

  delete from public.ticket_scans
  where match_id = p_match_id;

  delete from public.payments
  where match_id = p_match_id;

  delete from public.abuse_flags
  where match_id = p_match_id;

  delete from public.seat_holds
  where match_id = p_match_id;

  delete from public.reservations
  where match_id = p_match_id;

  delete from public.waitlist_entries
  where match_id = p_match_id;

  delete from public.matches
  where id = p_match_id;

  return jsonb_build_object(
    'matchId', p_match_id,
    'matchTitle', v_match.title,
    'deletedReservations', v_deleted_reservations,
    'deletedTickets', v_deleted_tickets,
    'deletedPayments', v_deleted_payments,
    'deletedScans', v_deleted_scans,
    'deletedHolds', v_deleted_holds,
    'deletedAbuseFlags', v_deleted_abuse_flags
  );
end;
$$;

grant execute on function public.admin_delete_match_cascade(uuid) to authenticated;
