alter table public.profiles
alter column can_reserve set default true;

update public.profiles p
set can_reserve = true
where p.can_reserve = false
  and not exists (
    select 1
    from public.user_blocks b
    where b.user_id = p.id
      and b.is_active = true
      and (b.ends_at is null or b.ends_at > now())
      and b.type in ('block', 'temp_ban')
  );

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, can_reserve)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    true
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      can_reserve = coalesce(public.profiles.can_reserve, excluded.can_reserve);

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict do nothing;

  return new;
end;
$$;
