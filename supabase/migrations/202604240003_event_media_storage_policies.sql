begin;

drop policy if exists "event_media_public_read" on storage.objects;
drop policy if exists "event_media_admin_insert" on storage.objects;
drop policy if exists "event_media_admin_update" on storage.objects;
drop policy if exists "event_media_admin_delete" on storage.objects;

create policy "event_media_public_read"
on storage.objects
for select
to public
using (bucket_id = 'event-media');

create policy "event_media_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'event-media'
  and public.user_has_any_role(array['admin', 'superadmin']::public.app_role[])
);

create policy "event_media_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'event-media'
  and public.user_has_any_role(array['admin', 'superadmin']::public.app_role[])
)
with check (
  bucket_id = 'event-media'
  and public.user_has_any_role(array['admin', 'superadmin']::public.app_role[])
);

create policy "event_media_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'event-media'
  and public.user_has_any_role(array['admin', 'superadmin']::public.app_role[])
);

commit;
