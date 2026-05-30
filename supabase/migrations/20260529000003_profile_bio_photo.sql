-- Profile bio and photo URL fields + public storage bucket for uploads.
-- Run in Supabase SQL Editor after prior migrations.

alter table public.profile_overrides
  add column if not exists bio text,
  add column if not exists photo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read profile photos" on storage.objects;
create policy "Public read profile photos"
on storage.objects
for select
to public
using (bucket_id = 'profile-photos');
