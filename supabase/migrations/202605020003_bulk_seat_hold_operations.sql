create or replace function public.acquire_multiple_seat_holds(
  p_match_id uuid,
  p_seat_ids uuid[],
  p_session_id text default null,
  p_gate_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seat_id uuid;
  v_requested_seat_ids uuid[];
begin
  v_requested_seat_ids := coalesce(
    array(
      select distinct seat_id
      from unnest(coalesce(p_seat_ids, array[]::uuid[])) as seat_id
      where seat_id is not null
    ),
    array[]::uuid[]
  );

  if array_length(v_requested_seat_ids, 1) is null then
    raise exception 'Nu au fost transmise locuri pentru blocare.';
  end if;

  foreach v_seat_id in array v_requested_seat_ids loop
    perform public.acquire_seat_hold(
      p_match_id,
      v_seat_id,
      p_session_id,
      p_gate_id
    );
  end loop;

  return public.get_active_hold_summary(p_match_id, p_session_id);
end;
$$;

create or replace function public.release_multiple_seat_holds(
  p_match_id uuid,
  p_seat_ids uuid[],
  p_hold_token uuid default null,
  p_session_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seat_id uuid;
  v_requested_seat_ids uuid[];
begin
  v_requested_seat_ids := coalesce(
    array(
      select distinct seat_id
      from unnest(coalesce(p_seat_ids, array[]::uuid[])) as seat_id
      where seat_id is not null
    ),
    array[]::uuid[]
  );

  if array_length(v_requested_seat_ids, 1) is null then
    raise exception 'Nu au fost transmise locuri pentru eliberare.';
  end if;

  foreach v_seat_id in array v_requested_seat_ids loop
    perform public.release_seat_hold(
      p_match_id,
      v_seat_id,
      p_hold_token,
      p_session_id
    );
  end loop;

  return public.get_active_hold_summary(p_match_id, p_session_id);
end;
$$;
