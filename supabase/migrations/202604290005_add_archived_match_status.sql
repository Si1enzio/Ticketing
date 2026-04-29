do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'match_status'
      and e.enumlabel = 'archived'
  ) then
    alter type public.match_status add value 'archived';
  end if;
end $$;

alter table public.matches
  add column if not exists archived_at timestamptz;

create index if not exists matches_status_starts_archived_idx
  on public.matches (status, starts_at desc, archived_at desc);
