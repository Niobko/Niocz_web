-- NioCZ LOC: osobni sbirka oblibenych her.
-- Spustte cely soubor v Supabase -> SQL Editor -> Run.
-- Oblibene hry jsou oddelene od sledovani a nevytvareji upozorneni.

begin;

create table if not exists public.user_favorite_games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_slug text not null references public.game_versions(game_slug) on update cascade on delete restrict,
  created_at timestamptz not null default now(),
  constraint user_favorite_games_user_game_key unique (user_id, game_slug)
);

create index if not exists user_favorite_games_user_created_idx
  on public.user_favorite_games (user_id, created_at desc);
create index if not exists user_favorite_games_game_slug_idx
  on public.user_favorite_games (game_slug);

alter table public.user_favorite_games enable row level security;

drop policy if exists "Users read own favorite games" on public.user_favorite_games;
create policy "Users read own favorite games" on public.user_favorite_games
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own favorite games" on public.user_favorite_games;
create policy "Users insert own favorite games" on public.user_favorite_games
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own favorite games" on public.user_favorite_games;
create policy "Users delete own favorite games" on public.user_favorite_games
for delete to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.user_favorite_games from public, anon, authenticated;
grant select, delete on table public.user_favorite_games to authenticated;
grant insert (user_id, game_slug) on table public.user_favorite_games to authenticated;

commit;

-- Kontrola po spusteni:
-- select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename = 'user_favorite_games';
-- select policyname, cmd, roles, qual, with_check from pg_policies where schemaname = 'public' and tablename = 'user_favorite_games';
