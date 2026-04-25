create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    contact_email,
    full_name,
    phone,
    locality,
    district,
    birth_date,
    gender,
    preferred_language,
    marketing_opt_in,
    sms_opt_in,
    can_reserve
  )
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'contact_email', ''), new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'locality', ''),
    nullif(new.raw_user_meta_data ->> 'district', ''),
    nullif(new.raw_user_meta_data ->> 'birth_date', '')::date,
    coalesce(nullif(new.raw_user_meta_data ->> 'gender', ''), 'unspecified'),
    coalesce(nullif(new.raw_user_meta_data ->> 'preferred_language', ''), 'ro'),
    case
      when lower(coalesce(new.raw_user_meta_data ->> 'marketing_opt_in', 'false')) = 'true' then true
      else false
    end,
    case
      when lower(coalesce(new.raw_user_meta_data ->> 'sms_opt_in', 'false')) = 'true' then true
      else false
    end,
    true
  )
  on conflict (id) do update
  set email = excluded.email,
      contact_email = coalesce(public.profiles.contact_email, excluded.contact_email),
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      phone = coalesce(public.profiles.phone, excluded.phone),
      locality = coalesce(public.profiles.locality, excluded.locality),
      district = coalesce(public.profiles.district, excluded.district),
      birth_date = coalesce(public.profiles.birth_date, excluded.birth_date),
      gender = coalesce(public.profiles.gender, excluded.gender),
      preferred_language = coalesce(public.profiles.preferred_language, excluded.preferred_language),
      marketing_opt_in = coalesce(public.profiles.marketing_opt_in, excluded.marketing_opt_in),
      sms_opt_in = coalesce(public.profiles.sms_opt_in, excluded.sms_opt_in),
      can_reserve = coalesce(public.profiles.can_reserve, excluded.can_reserve);

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict do nothing;

  return new;
end;
$$;
