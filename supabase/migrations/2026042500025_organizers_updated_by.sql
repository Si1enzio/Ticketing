alter table public.organizers
  add column if not exists updated_by uuid references auth.users(id) on delete set null;
