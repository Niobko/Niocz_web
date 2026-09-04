-- Spusťte celý soubor jednou v Supabase -> SQL Editor -> Run.
-- Jedna tabulka ukládá hvězdičky i like/dislike. Primární klíč brání
-- opakovaným hlasům stejného účtu pro stejnou hru.

create table if not exists public.game_ratings (
  game_slug text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  stars smallint,
  reaction smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_ratings_pkey primary key (game_slug, user_id),
  constraint game_ratings_game_slug_check check (game_slug = any (array[
    'alchemy-factory',
    'bombanana',
    'breathedge-2',
    'hearth-and-hamlet',
    'kingdom-rush-vengeance',
    'kynseed',
    'parcel-simulator',
    'powerwash-simulator-2',
    'yet-another-zombie-survivors',
    'e-shop-tycoon',
    'cloverpit',
    'timberborn',
    'restory',
    'sleeping-dogs',
    'leafy-corner',
    'bookshop-simulator',
    'factory-planner',
    'streamer-life-simulator-2',
    'the-spell-brigade',
    'the-universim',
    'youtubers-life-2',
    'catmailco',
    'vacation-cafe-simulator',
    'warhounds'
  ]::text[])),
  constraint game_ratings_stars_check check (stars is null or stars between 1 and 5),
  constraint game_ratings_reaction_check check (reaction is null or reaction in (-1, 1)),
  constraint game_ratings_has_vote_check check (stars is not null or reaction is not null)
);

-- Při opakovaném spuštění rozšíří whitelist i v již existující tabulce.
-- Dočasný constraint se nejdříve ověří, takže původní zůstane aktivní,
-- dokud se nový seznam úspěšně nepotvrdí.
alter table public.game_ratings
  drop constraint if exists game_ratings_game_slug_check_v2;

alter table public.game_ratings
  add constraint game_ratings_game_slug_check_v2
  check (game_slug = any (array[
    'alchemy-factory',
    'bombanana',
    'breathedge-2',
    'hearth-and-hamlet',
    'kingdom-rush-vengeance',
    'kynseed',
    'parcel-simulator',
    'powerwash-simulator-2',
    'yet-another-zombie-survivors',
    'e-shop-tycoon',
    'cloverpit',
    'timberborn',
    'restory',
    'sleeping-dogs',
    'leafy-corner',
    'bookshop-simulator',
    'factory-planner',
    'streamer-life-simulator-2',
    'the-spell-brigade',
    'the-universim',
    'youtubers-life-2',
    'catmailco',
    'vacation-cafe-simulator',
    'warhounds'
  ]::text[])) not valid;

alter table public.game_ratings
  validate constraint game_ratings_game_slug_check_v2;

alter table public.game_ratings
  drop constraint if exists game_ratings_game_slug_check;

alter table public.game_ratings
  rename constraint game_ratings_game_slug_check_v2
  to game_ratings_game_slug_check;

create index if not exists game_ratings_user_id_idx
  on public.game_ratings (user_id);

create or replace function public.set_game_rating_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_game_rating_updated_at on public.game_ratings;
create trigger set_game_rating_updated_at
before update on public.game_ratings
for each row execute function public.set_game_rating_updated_at();

alter table public.game_ratings enable row level security;

drop policy if exists "Users can read own game ratings" on public.game_ratings;
create policy "Users can read own game ratings"
on public.game_ratings for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own game ratings" on public.game_ratings;
create policy "Users can insert own game ratings"
on public.game_ratings for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own game ratings" on public.game_ratings;
create policy "Users can update own game ratings"
on public.game_ratings for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own game ratings" on public.game_ratings;
create policy "Users can delete own game ratings"
on public.game_ratings for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.game_ratings from anon;
grant select, insert, update, delete on table public.game_ratings to authenticated;

create or replace function public.get_game_rating_summary(requested_game_slug text)
returns table (
  rating_average numeric,
  rating_count bigint,
  like_count bigint,
  dislike_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    round(avg(r.stars)::numeric, 2) as rating_average,
    count(r.stars) as rating_count,
    count(*) filter (where r.reaction = 1) as like_count,
    count(*) filter (where r.reaction = -1) as dislike_count
  from public.game_ratings as r
  where r.game_slug = requested_game_slug;
$$;

revoke all on function public.get_game_rating_summary(text) from public;
grant execute on function public.get_game_rating_summary(text) to anon, authenticated;
