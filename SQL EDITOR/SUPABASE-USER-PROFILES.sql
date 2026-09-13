-- NioCZ LOC: veřejné profily, avatary a bezpečné uživatelské úpravy.
-- Spusťte ručně v Supabase SQL Editoru. Skript je idempotentní.

begin;

alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists avatar_path text,
  add column if not exists bio text;

alter table public.profiles
  drop constraint if exists profiles_display_name_length,
  add constraint profiles_display_name_length
    check (display_name is null or char_length(btrim(display_name)) between 2 and 40) not valid,
  drop constraint if exists profiles_bio_length,
  add constraint profiles_bio_length
    check (bio is null or char_length(bio) <= 280) not valid,
  drop constraint if exists profiles_avatar_url_length,
  add constraint profiles_avatar_url_length
    check (avatar_url is null or char_length(avatar_url) <= 2048) not valid,
  drop constraint if exists profiles_avatar_path_owner,
  add constraint profiles_avatar_path_owner
    check (avatar_path is null or avatar_path like id::text || '/%') not valid;

alter table public.profiles enable row level security;

drop policy if exists "Public profile fields are readable" on public.profiles;
create policy "Public profile fields are readable"
on public.profiles for select
to anon, authenticated
using (true);

drop policy if exists "Users can insert own safe profile" on public.profiles;
create policy "Users can insert own safe profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Users can update own safe profile" on public.profiles;
create policy "Users can update own safe profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Omezí frontend pouze na neprivilegovaná profilová pole. is_author/is_admin
-- zůstávají spravovatelné jen databázovým administrátorem nebo existujícími RPC.
revoke insert, update on table public.profiles from authenticated;
grant insert (id, display_name, avatar_url, avatar_path, bio) on table public.profiles to authenticated;
grant update (display_name, avatar_url, avatar_path, bio) on table public.profiles to authenticated;
revoke select on table public.profiles from anon, authenticated;
grant select (id, display_name, avatar_url, avatar_path, bio, is_author)
  on table public.profiles to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload own avatars" on storage.objects;
create policy "Users can upload own avatars"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can inspect own avatars" on storage.objects;
create policy "Users can inspect own avatars"
on storage.objects for select
to authenticated
using (
  bucket_id = 'avatars'
  and owner_id = (select auth.uid()::text)
);

drop policy if exists "Users can update own avatars" on storage.objects;
create policy "Users can update own avatars"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and owner_id = (select auth.uid()::text)
)
with check (
  bucket_id = 'avatars'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can delete own avatars" on storage.objects;
create policy "Users can delete own avatars"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and owner_id = (select auth.uid()::text)
);

commit;
