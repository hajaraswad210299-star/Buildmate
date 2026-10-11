-- ==========================================================
-- BUILDMATE AVATARS STORAGE BUCKET & RLS POLICIES (A09 & B11)
-- ==========================================================

-- 1. Create public bucket 'avatars'
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- 2. Anyone can view avatars (public read)
create policy "Public avatars view"
on storage.objects for select
using (bucket_id = 'avatars');

-- 3. Authenticated user can upload to their own folder: {user_id}/avatar.webp
create policy "Users can upload their own avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Authenticated user can update their own avatar
create policy "Users can update their own avatar"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. Authenticated user can delete their own avatar
create policy "Users can delete their own avatar"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
