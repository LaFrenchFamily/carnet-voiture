-- Private bucket for invoices and vehicle photos, laid out as {user_id}/{vehicle_id}/{file}.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'factures', 'factures', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp']
)
on conflict (id) do nothing;

create policy "read own files" on storage.objects for select to authenticated
  using (bucket_id = 'factures' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "upload own files" on storage.objects for insert to authenticated
  with check (bucket_id = 'factures' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "update own files" on storage.objects for update to authenticated
  using (bucket_id = 'factures' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "delete own files" on storage.objects for delete to authenticated
  using (bucket_id = 'factures' and (storage.foldername(name))[1] = (select auth.uid())::text);
