-- NioCZ LOC: sledovane hry, webova upozorneni, odznaky a bezpecna sprava.
-- Spustte cely soubor v Supabase -> SQL Editor -> Run.
-- Skript je idempotentni a neobsahuje zadny service_role klic.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.game_versions (
  game_slug text primary key,
  name text not null,
  translation_version text not null,
  supported_game_version text not null,
  translation_updated_at date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_versions_slug_check check (game_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint game_versions_name_check check (char_length(btrim(name)) between 1 and 120),
  constraint game_versions_translation_check check (char_length(btrim(translation_version)) between 1 and 80),
  constraint game_versions_supported_check check (char_length(btrim(supported_game_version)) between 1 and 120)
);

insert into public.game_versions (game_slug, name, translation_version, supported_game_version, translation_updated_at)
values
  ('scrap-mechanic', 'Scrap Mechanic', 'v1.0', 'v1.0.5', '2026-09-13'),
  ('no-mans-sky', 'No Man''s Sky', 'v1.0', 'COSMOS (7.0)', '2026-09-12'),
  ('ready-or-not', 'Ready or Not', 'v1.0', 'v1.5.2', '2026-09-10'),
  ('astroneer', 'Astroneer', 'v1.0', 'v1.43.2', '2026-09-08'),
  ('shapez-2', 'Shapez-2', 'v1.0', 'v1.2.0-rc3', '2026-09-08'),
  ('prince-of-persia-the-lost-crown', 'Prince of Persia The Lost Crown', 'v0.1', 'v1.4.3', '2026-09-07'),
  ('arms-of-god', 'Arms of God', 'v0.1', 'v0.601', '2026-09-05'),
  ('kingdom-rush-vengeance', 'Kingdom Rush Vengeance', 'v0.1', 'v1.16.4.0', '2026-09-04'),
  ('sleeping-dogs', 'Sleeping Dogs', 'v0.1', 'v1.0', '2026-09-04'),
  ('vacation-cafe-simulator', 'Vacation Cafe Simulator', '0.4', '1.0.6', '2026-09-11'),
  ('bombanana', 'BOMBANANA', 'v0.3', 'v1.0.2', '2026-09-12'),
  ('breathedge-2', 'Breathedge 2', 'v0.3', 'v0.8.9', '2026-09-13'),
  ('parcel-simulator', 'Parcel Simulator', 'v0.1', 'v2.0.1.3', '2026-09-01'),
  ('the-spell-brigade', 'The Spell Brigade', 'v0.3', 'v1.1.2.19558', '2026-09-09'),
  ('warhounds', 'Warhounds', 'v0.1', 'v1.0.1', '2026-08-30'),
  ('powerwash-simulator-2', 'PowerWash Simulator 2', 'v0.1', 'v1.3.0', '2026-08-29'),
  ('hearth-and-hamlet', 'Hearth and Hamlet', 'v0.3', 'v1.0.07', '2026-08-30'),
  ('kynseed', 'Kynseed', 'v0.1', 'v1.3', '2026-08-28'),
  ('alchemy-factory', 'Alchemy Factory', 'v1.0', 'v1.0.4950', '2026-09-12'),
  ('e-shop-tycoon', 'E-Shop Tycoon', '0.2', 'v1.0.8-17ec132', '2026-08-30'),
  ('yet-another-zombie-survivors', 'Yet Another Zombie Survivors', 'v0.4', 'v1.0.1', '2026-09-10'),
  ('cloverpit', 'CloverPit', '0.1', 'v1.4.11', '2026-08-23'),
  ('timberborn', 'Timberborn', '0.2', 'v1.1.2.4-52e959e-SW', '2026-09-08'),
  ('catmailco', 'CatMailCo', '0.2', 'patch 6', '2026-08-30'),
  ('youtubers-life-2', 'Youtubers Life 2', 'v0.1', 'v1.4.0', '2026-08-21'),
  ('the-universim', 'The Universim', 'v0.1', 'v1.0.02.48225', '2026-08-19'),
  ('streamer-life-simulator-2', 'Streamer Life Simulator 2', 'v0.1', 'Aktualni verze', '2026-08-20'),
  ('factory-planner', 'Factory Planner', '0.1', 'EA v1.0.11', '2026-08-16'),
  ('leafy-corner', 'Leafy Corner', '0.1', 'v1.0.3(ws)', '2026-08-14'),
  ('bookshop-simulator', 'Bookshop Simulator', '0.2', 'v1.0.1233', '2026-08-30'),
  ('restory', 'ReStory: Chill Electronics Repairs', '0.4', '1.0.015R', '2026-08-30')
on conflict (game_slug) do nothing;

create table if not exists public.user_followed_games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_slug text not null references public.game_versions(game_slug) on update cascade on delete restrict,
  notify_updates boolean not null default true,
  last_seen_version text,
  last_seen_game_version text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  constraint user_followed_games_user_game_key unique (user_id, game_slug)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  game_slug text references public.game_versions(game_slug) on update cascade on delete set null,
  title text not null,
  message text not null,
  event_key text not null,
  channels text[] not null default array['web']::text[],
  email_status text not null default 'not_requested',
  payload jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_check check (type in ('translation_version', 'game_version', 'badge', 'system')),
  constraint notifications_email_status_check check (email_status in ('not_requested', 'pending', 'sent', 'failed')),
  constraint notifications_user_event_key unique (user_id, event_key)
);

create table if not exists public.badges (
  id bigint generated by default as identity primary key,
  slug text not null unique,
  name text not null,
  description text not null,
  image_url text not null,
  requirement_type text not null,
  requirement_value integer,
  automatic boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint badges_slug_check check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint badges_image_path_check check (image_url ~ '^/assets/badges/[a-z0-9-]+\.png$'),
  constraint badges_requirement_check check ((automatic and requirement_value > 0) or (not automatic and requirement_value is null))
);

insert into public.badges (slug, name, description, image_url, requirement_type, requirement_value, automatic, sort_order)
values
  ('komentator', 'Komentátor', 'Napsal alespoň 5 komentářů.', '/assets/badges/komentator.png', 'comments', 5, true, 10),
  ('diskuter', 'Diskutér', 'Aktivně se zapojuje do diskusí a napsal alespoň 25 komentářů.', '/assets/badges/diskuter.png', 'comments', 25, true, 20),
  ('lovec-chyb', 'Lovec chyb', 'Pomohl najít alespoň 5 potvrzených chyb v překladech.', '/assets/badges/lovec-chyb.png', 'confirmed_bug_reports', 5, true, 30),
  ('tester', 'Tester', 'Pomáhá testovat nové verze překladů NioCZ LOC.', '/assets/badges/tester.png', 'manual', null, false, 40),
  ('hlasujici', 'Hlasující', 'Zúčastnil se alespoň 10 hlasování na NioCZ LOC.', '/assets/badges/hlasujici.png', 'votes', 10, true, 50),
  ('sberatel', 'Sběratel', 'Sleduje alespoň 10 her na NioCZ LOC.', '/assets/badges/sberatel.png', 'followed_games', 10, true, 60),
  ('veteran', 'Veterán', 'Je součástí NioCZ LOC alespoň 6 měsíců.', '/assets/badges/veteran.png', 'account_days', 180, true, 70),
  ('podporovatel', 'Podporovatel', 'Podpořil projekt NioCZ LOC.', '/assets/badges/podporovatel.png', 'manual', null, false, 80)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    image_url = excluded.image_url,
    requirement_type = excluded.requirement_type,
    requirement_value = excluded.requirement_value,
    automatic = excluded.automatic,
    sort_order = excluded.sort_order;

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id bigint not null references public.badges(id) on update cascade on delete cascade,
  unlocked_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null,
  grant_source text not null default 'automatic',
  seen_at timestamptz,
  constraint user_badges_user_badge_key unique (user_id, badge_id),
  constraint user_badges_source_check check (grant_source in ('automatic', 'manual'))
);

create table if not exists public.badge_admin_overrides (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id bigint not null references public.badges(id) on delete cascade,
  is_blocked boolean not null default false,
  updated_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

alter table public.profiles
  add column if not exists created_at timestamptz,
  add column if not exists selected_badge_id bigint,
  add column if not exists is_admin boolean default false;

update public.profiles set is_admin = false where is_admin is null;
alter table public.profiles alter column is_admin set default false;
alter table public.profiles alter column is_admin set not null;

update public.profiles as profile
set created_at = auth_user.created_at
from auth.users as auth_user
where auth_user.id = profile.id
  and profile.created_at is null;

update public.profiles set created_at = now() where created_at is null;
alter table public.profiles alter column created_at set default now();
alter table public.profiles alter column created_at set not null;

do $block$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_selected_badge_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_selected_badge_id_fkey
      foreign key (selected_badge_id) references public.badges(id) on delete set null;
  end if;
end
$block$;

alter table public.bug_reports
  add column if not exists is_confirmed boolean not null default false,
  add column if not exists confirmed_at timestamptz;

create index if not exists user_followed_games_user_created_idx on public.user_followed_games (user_id, created_at desc);
create index if not exists user_followed_games_notify_idx on public.user_followed_games (game_slug, user_id) where notify_updates;
create index if not exists notifications_user_unread_idx on public.notifications (user_id, created_at desc) where not is_read;
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index if not exists user_badges_user_unlocked_idx on public.user_badges (user_id, unlocked_at desc);
create index if not exists user_badges_badge_idx on public.user_badges (badge_id);
create index if not exists bug_reports_confirmed_user_idx on public.bug_reports (user_id) where is_confirmed or status in ('Vyriešené', 'Vyřešené', 'resolved', 'confirmed');

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1 from public.profiles as profile
    where profile.id = auth.uid() and profile.is_admin = true
  );
$function$;

revoke all on function private.is_admin() from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

create or replace function private.set_game_versions_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

revoke all on function private.set_game_versions_updated_at() from public, anon, authenticated;
drop trigger if exists set_game_versions_updated_at on public.game_versions;
create trigger set_game_versions_updated_at
before update on public.game_versions
for each row execute function private.set_game_versions_updated_at();

create or replace function private.snapshot_followed_game_versions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_game public.game_versions%rowtype;
begin
  if new.user_id is distinct from auth.uid() then
    raise exception 'A followed game can only be created for the signed-in user.' using errcode = '42501';
  end if;

  select * into current_game from public.game_versions where game_slug = new.game_slug;
  new.last_seen_version = current_game.translation_version;
  new.last_seen_game_version = current_game.supported_game_version;
  new.last_seen_at = now();
  return new;
end;
$function$;

revoke all on function private.snapshot_followed_game_versions() from public, anon, authenticated;
drop trigger if exists snapshot_followed_game_versions on public.user_followed_games;
create trigger snapshot_followed_game_versions
before insert on public.user_followed_games
for each row execute function private.snapshot_followed_game_versions();

create or replace function private.notify_followers_of_version_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.translation_version is distinct from old.translation_version then
    insert into public.notifications (user_id, type, game_slug, title, message, event_key, payload)
    select followed.user_id,
           'translation_version',
           new.game_slug,
           'Nová verze češtiny',
           new.name || ' má novou verzi češtiny ' || new.translation_version || '.',
           'translation:' || new.game_slug || ':' || new.translation_version || ':' || extract(epoch from new.updated_at)::text,
           jsonb_build_object('previous_version', old.translation_version, 'version', new.translation_version)
    from public.user_followed_games as followed
    where followed.game_slug = new.game_slug and followed.notify_updates
    on conflict (user_id, event_key) do nothing;
  end if;

  if new.supported_game_version is distinct from old.supported_game_version then
    insert into public.notifications (user_id, type, game_slug, title, message, event_key, payload)
    select followed.user_id,
           'game_version',
           new.game_slug,
           'Aktualizovaná podpora hry',
           new.name || ' byl aktualizován pro verzi hry ' || new.supported_game_version || '.',
           'game:' || new.game_slug || ':' || new.supported_game_version || ':' || extract(epoch from new.updated_at)::text,
           jsonb_build_object('previous_version', old.supported_game_version, 'version', new.supported_game_version)
    from public.user_followed_games as followed
    where followed.game_slug = new.game_slug and followed.notify_updates
    on conflict (user_id, event_key) do nothing;
  end if;

  return new;
end;
$function$;

revoke all on function private.notify_followers_of_version_change() from public, anon, authenticated;
drop trigger if exists notify_followers_of_version_change on public.game_versions;
create trigger notify_followers_of_version_change
after update of translation_version, supported_game_version on public.game_versions
for each row
when (new.translation_version is distinct from old.translation_version or new.supported_game_version is distinct from old.supported_game_version)
execute function private.notify_followers_of_version_change();

create or replace function private.award_automatic_badges(requested_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if requested_user_id is null then return; end if;

  insert into public.user_badges (user_id, badge_id, grant_source)
  select requested_user_id, badge.id, 'automatic'
  from public.badges as badge
  where badge.automatic
    and not exists (
      select 1 from public.badge_admin_overrides as override_row
      where override_row.user_id = requested_user_id
        and override_row.badge_id = badge.id
        and override_row.is_blocked
    )
    and case badge.requirement_type
      when 'comments' then (select count(*) from public.comments where user_id = requested_user_id) >= badge.requirement_value
      when 'votes' then (select count(*) from public.translation_votes where user_id = requested_user_id) >= badge.requirement_value
      when 'followed_games' then (select count(*) from public.user_followed_games where user_id = requested_user_id) >= badge.requirement_value
      when 'confirmed_bug_reports' then (
        select count(*) from public.bug_reports
        where user_id = requested_user_id
          and (is_confirmed or status in ('Vyriešené', 'Vyřešené', 'resolved', 'confirmed'))
      ) >= badge.requirement_value
      when 'account_days' then exists (
        select 1 from public.profiles
        where id = requested_user_id and created_at <= now() - make_interval(days => badge.requirement_value)
      )
      else false
    end
  on conflict (user_id, badge_id) do nothing;
end;
$function$;

revoke all on function private.award_automatic_badges(uuid) from public, anon, authenticated;

create or replace function private.notify_badge_unlock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.notifications (user_id, type, title, message, event_key, payload)
  select new.user_id,
         'badge',
         'Nový odznak odemčen',
         'Získali jste odznak ' || badge.name || '.',
         'badge:' || badge.slug,
         jsonb_build_object('badge_id', badge.id, 'badge_slug', badge.slug)
  from public.badges as badge
  where badge.id = new.badge_id
  on conflict (user_id, event_key) do nothing;
  return new;
end;
$function$;

revoke all on function private.notify_badge_unlock() from public, anon, authenticated;
drop trigger if exists notify_badge_unlock on public.user_badges;
create trigger notify_badge_unlock
after insert on public.user_badges
for each row execute function private.notify_badge_unlock();

create or replace function private.award_badge_after_user_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform private.award_automatic_badges(new.user_id);
  return new;
end;
$function$;

revoke all on function private.award_badge_after_user_activity() from public, anon, authenticated;
drop trigger if exists award_badge_after_comment on public.comments;
create trigger award_badge_after_comment after insert on public.comments
for each row execute function private.award_badge_after_user_activity();
drop trigger if exists award_badge_after_vote on public.translation_votes;
create trigger award_badge_after_vote after insert on public.translation_votes
for each row execute function private.award_badge_after_user_activity();
drop trigger if exists award_badge_after_follow on public.user_followed_games;
create trigger award_badge_after_follow after insert on public.user_followed_games
for each row execute function private.award_badge_after_user_activity();

create or replace function private.award_badge_after_bug_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.is_confirmed or new.status in ('Vyriešené', 'Vyřešené', 'resolved', 'confirmed') then
    perform private.award_automatic_badges(new.user_id);
  end if;
  return new;
end;
$function$;

revoke all on function private.award_badge_after_bug_report() from public, anon, authenticated;
drop trigger if exists award_badge_after_bug_report on public.bug_reports;
create trigger award_badge_after_bug_report
after insert or update of is_confirmed, status on public.bug_reports
for each row execute function private.award_badge_after_bug_report();

create or replace function private.validate_selected_badge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.selected_badge_id is not null and not exists (
    select 1 from public.user_badges
    where user_id = new.id and badge_id = new.selected_badge_id
  ) then
    raise exception 'The displayed badge must already be unlocked.' using errcode = '23514';
  end if;
  return new;
end;
$function$;

revoke all on function private.validate_selected_badge() from public, anon, authenticated;
drop trigger if exists validate_selected_badge on public.profiles;
create trigger validate_selected_badge
before insert or update of selected_badge_id on public.profiles
for each row execute function private.validate_selected_badge();

create or replace function private.guard_bug_report_confirmation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'INSERT' and new.is_confirmed and not private.is_admin() then
    raise exception 'Only an administrator can confirm a bug report.' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE'
     and new.is_confirmed is distinct from old.is_confirmed
     and not private.is_admin() then
    raise exception 'Only an administrator can confirm a bug report.' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    new.confirmed_at = case when new.is_confirmed then now() else null end;
  elsif new.is_confirmed is distinct from old.is_confirmed then
    new.confirmed_at = case when new.is_confirmed then now() else null end;
  end if;
  return new;
end;
$function$;

revoke all on function private.guard_bug_report_confirmation() from public, anon, authenticated;
drop trigger if exists guard_bug_report_confirmation on public.bug_reports;
create trigger guard_bug_report_confirmation
before insert or update of is_confirmed on public.bug_reports
for each row execute function private.guard_bug_report_confirmation();

alter table public.game_versions enable row level security;
alter table public.user_followed_games enable row level security;
alter table public.notifications enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.badge_admin_overrides enable row level security;

drop policy if exists "Game versions are publicly readable" on public.game_versions;
create policy "Game versions are publicly readable" on public.game_versions
for select to anon, authenticated using (true);

drop policy if exists "Users read own followed games" on public.user_followed_games;
create policy "Users read own followed games" on public.user_followed_games
for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users insert own followed games" on public.user_followed_games;
create policy "Users insert own followed games" on public.user_followed_games
for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users update own followed games" on public.user_followed_games;
create policy "Users update own followed games" on public.user_followed_games
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
drop policy if exists "Users delete own followed games" on public.user_followed_games;
create policy "Users delete own followed games" on public.user_followed_games
for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications" on public.notifications
for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users mark own notifications read" on public.notifications;
create policy "Users mark own notifications read" on public.notifications
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Badges are publicly readable" on public.badges;
create policy "Badges are publicly readable" on public.badges
for select to anon, authenticated using (true);

drop policy if exists "Users read own earned badges" on public.user_badges;
create policy "Users read own earned badges" on public.user_badges
for select to authenticated
using ((select auth.uid()) = user_id or private.is_admin());

drop policy if exists "Admins read badge overrides" on public.badge_admin_overrides;
create policy "Admins read badge overrides" on public.badge_admin_overrides
for select to authenticated using (private.is_admin());

revoke all on table public.game_versions from public, anon, authenticated;
grant select on table public.game_versions to anon, authenticated;
revoke all on table public.user_followed_games from public, anon, authenticated;
grant select, delete on table public.user_followed_games to authenticated;
grant insert (user_id, game_slug, notify_updates) on table public.user_followed_games to authenticated;
grant update (notify_updates) on table public.user_followed_games to authenticated;
revoke all on table public.notifications from public, anon, authenticated;
grant select on table public.notifications to authenticated;
grant update (is_read, read_at) on table public.notifications to authenticated;
revoke all on table public.badges from public, anon, authenticated;
grant select on table public.badges to anon, authenticated;
revoke all on table public.user_badges from public, anon, authenticated;
grant select on table public.user_badges to authenticated;
revoke all on table public.badge_admin_overrides from public, anon, authenticated;

grant select (created_at, selected_badge_id) on table public.profiles to anon, authenticated;
grant select (is_confirmed, confirmed_at) on table public.bug_reports to anon, authenticated;

create or replace function public.refresh_my_badges()
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare caller_id uuid := auth.uid();
begin
  if caller_id is null then raise exception 'Authentication is required.' using errcode = '42501'; end if;
  perform private.award_automatic_badges(caller_id);
end;
$function$;

revoke all on function public.refresh_my_badges() from public, anon, authenticated;
grant execute on function public.refresh_my_badges() to authenticated;

create or replace function public.get_my_badge_progress()
returns table (
  badge_id bigint, slug text, name text, description text, image_url text,
  requirement_type text, requirement_value integer, automatic boolean,
  progress_value integer, unlocked_at timestamptz, seen_at timestamptz, is_selected boolean
)
language sql
stable
security definer
set search_path = ''
as $function$
  select badge.id,
         badge.slug,
         badge.name,
         badge.description,
         badge.image_url,
         badge.requirement_type,
         badge.requirement_value,
         badge.automatic,
         case badge.requirement_type
           when 'comments' then (select count(*)::integer from public.comments where user_id = auth.uid())
           when 'votes' then (select count(*)::integer from public.translation_votes where user_id = auth.uid())
           when 'followed_games' then (select count(*)::integer from public.user_followed_games where user_id = auth.uid())
           when 'confirmed_bug_reports' then (
             select count(*)::integer from public.bug_reports
             where user_id = auth.uid()
               and (is_confirmed or status in ('Vyriešené', 'Vyřešené', 'resolved', 'confirmed'))
           )
           when 'account_days' then coalesce((
             select greatest(0, floor(extract(epoch from (now() - created_at)) / 86400))::integer
             from public.profiles where id = auth.uid()
           ), 0)
           else case when earned.id is null then 0 else 1 end
         end as progress_value,
         earned.unlocked_at,
         earned.seen_at,
         profile.selected_badge_id = badge.id as is_selected
  from public.badges as badge
  left join public.user_badges as earned on earned.user_id = auth.uid() and earned.badge_id = badge.id
  left join public.profiles as profile on profile.id = auth.uid()
  where auth.uid() is not null
  order by badge.sort_order, badge.id;
$function$;

revoke all on function public.get_my_badge_progress() from public, anon, authenticated;
grant execute on function public.get_my_badge_progress() to authenticated;

create or replace function public.mark_badge_seen(requested_badge_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare changed_id uuid;
begin
  if auth.uid() is null then return false; end if;
  update public.user_badges set seen_at = coalesce(seen_at, now())
  where user_id = auth.uid() and badge_id = requested_badge_id
  returning id into changed_id;
  return changed_id is not null;
end;
$function$;

revoke all on function public.mark_badge_seen(bigint) from public, anon, authenticated;
grant execute on function public.mark_badge_seen(bigint) to authenticated;

create or replace function public.set_my_displayed_badge(requested_badge_slug text default null)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare caller_id uuid := auth.uid(); selected_id bigint;
begin
  if caller_id is null then raise exception 'Authentication is required.' using errcode = '42501'; end if;
  if requested_badge_slug is not null then
    select badge.id into selected_id
    from public.badges as badge
    join public.user_badges as earned on earned.badge_id = badge.id and earned.user_id = caller_id
    where badge.slug = requested_badge_slug;
    if selected_id is null then raise exception 'Only an unlocked badge can be displayed.' using errcode = '42501'; end if;
  end if;
  update public.profiles set selected_badge_id = selected_id where id = caller_id;
  return selected_id;
end;
$function$;

revoke all on function public.set_my_displayed_badge(text) from public, anon, authenticated;
grant execute on function public.set_my_displayed_badge(text) to authenticated;

create or replace function public.mark_followed_game_seen(requested_game_slug text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare changed_id uuid;
begin
  if auth.uid() is null then return false; end if;
  update public.user_followed_games as followed
  set last_seen_version = game.translation_version,
      last_seen_game_version = game.supported_game_version,
      last_seen_at = now()
  from public.game_versions as game
  where followed.user_id = auth.uid()
    and followed.game_slug = requested_game_slug
    and game.game_slug = followed.game_slug
  returning followed.id into changed_id;
  return changed_id is not null;
end;
$function$;

revoke all on function public.mark_followed_game_seen(text) from public, anon, authenticated;
grant execute on function public.mark_followed_game_seen(text) to authenticated;

create or replace function public.admin_update_game_version(
  requested_game_slug text,
  requested_translation_version text,
  requested_supported_game_version text,
  requested_translation_updated_at date
)
returns public.game_versions
language plpgsql
security definer
set search_path = ''
as $function$
declare saved public.game_versions%rowtype;
begin
  if not private.is_admin() then raise exception 'Administrator permission is required.' using errcode = '42501'; end if;
  if nullif(btrim(requested_translation_version), '') is null or char_length(btrim(requested_translation_version)) > 80 then
    raise exception 'Invalid translation version.' using errcode = '22023';
  end if;
  if nullif(btrim(requested_supported_game_version), '') is null or char_length(btrim(requested_supported_game_version)) > 120 then
    raise exception 'Invalid supported game version.' using errcode = '22023';
  end if;
  update public.game_versions
  set translation_version = btrim(requested_translation_version),
      supported_game_version = btrim(requested_supported_game_version),
      translation_updated_at = requested_translation_updated_at
  where game_slug = requested_game_slug
    and (translation_version, supported_game_version, translation_updated_at)
        is distinct from (btrim(requested_translation_version), btrim(requested_supported_game_version), requested_translation_updated_at)
  returning * into saved;
  if saved.game_slug is null then select * into saved from public.game_versions where game_slug = requested_game_slug; end if;
  if saved.game_slug is null then raise exception 'Unknown game slug.' using errcode = '22023'; end if;
  return saved;
end;
$function$;

revoke all on function public.admin_update_game_version(text, text, text, date) from public, anon, authenticated;
grant execute on function public.admin_update_game_version(text, text, text, date) to authenticated;

create or replace function public.admin_set_user_badge(requested_user_id uuid, requested_badge_slug text, should_grant boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare caller_id uuid := auth.uid(); target_badge_id bigint;
begin
  if not private.is_admin() then raise exception 'Administrator permission is required.' using errcode = '42501'; end if;
  select id into target_badge_id from public.badges where slug = requested_badge_slug;
  if target_badge_id is null then raise exception 'Unknown badge.' using errcode = '22023'; end if;
  insert into public.badge_admin_overrides (user_id, badge_id, is_blocked, updated_by, updated_at)
  values (requested_user_id, target_badge_id, not should_grant, caller_id, now())
  on conflict (user_id, badge_id) do update
  set is_blocked = excluded.is_blocked, updated_by = caller_id, updated_at = now();
  if should_grant then
    insert into public.user_badges (user_id, badge_id, granted_by, grant_source)
    values (requested_user_id, target_badge_id, caller_id, 'manual')
    on conflict (user_id, badge_id) do nothing;
  else
    update public.profiles set selected_badge_id = null
    where id = requested_user_id and selected_badge_id = target_badge_id;
    delete from public.user_badges where user_id = requested_user_id and badge_id = target_badge_id;
  end if;
  return true;
end;
$function$;

revoke all on function public.admin_set_user_badge(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.admin_set_user_badge(uuid, text, boolean) to authenticated;

create or replace function public.admin_set_bug_report_confirmed(requested_report_id uuid, requested_confirmed boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare changed_id uuid;
begin
  if not private.is_admin() then raise exception 'Administrator permission is required.' using errcode = '42501'; end if;
  update public.bug_reports set is_confirmed = requested_confirmed where id = requested_report_id returning id into changed_id;
  return changed_id is not null;
end;
$function$;

revoke all on function public.admin_set_bug_report_confirmed(uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_set_bug_report_confirmed(uuid, boolean) to authenticated;

-- Prvni bezpecne vyhodnoceni stavajicich uctu. Nic neodebira.
select private.award_automatic_badges(id) from public.profiles;

-- Realtime Postgres Changes pro zvonecek. Nezasahuje do uzamcene realtime schema.
do $block$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
     ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$block$;

commit;

-- Kontrolni dotazy po uspesnem spusteni:
-- select game_slug, translation_version, supported_game_version from public.game_versions order by game_slug;
-- select slug, name, image_url, automatic from public.badges order by sort_order;
-- select tablename, policyname, roles, cmd from pg_policies
-- where schemaname = 'public' and tablename in ('game_versions','user_followed_games','notifications','badges','user_badges','badge_admin_overrides')
-- order by tablename, policyname;
