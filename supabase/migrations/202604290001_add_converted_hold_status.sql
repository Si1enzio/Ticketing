do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'hold_status'
      and e.enumlabel = 'converted'
  ) then
    alter type public.hold_status add value 'converted';
  end if;
end $$;
