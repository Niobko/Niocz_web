-- NioCZ LOC: zapojeni hry Wanderburg do vsech ulozenych hernich funkci.
-- Spustte jednou v Supabase -> SQL Editor -> Run.
-- Skript je idempotentni a neobsahuje zadny service_role klic.

begin;

insert into public.game_versions (
  game_slug, name, translation_version, supported_game_version, translation_updated_at
)
values ('wanderburg', 'Wanderburg', 'v0.1', '0.9.11', date '2026-09-14')
on conflict (game_slug) do update
set name = excluded.name,
    translation_version = excluded.translation_version,
    supported_game_version = excluded.supported_game_version,
    translation_updated_at = excluded.translation_updated_at,
    updated_at = now()
where row(
  game_versions.name,
  game_versions.translation_version,
  game_versions.supported_game_version,
  game_versions.translation_updated_at
) is distinct from row(
  excluded.name,
  excluded.translation_version,
  excluded.supported_game_version,
  excluded.translation_updated_at
);

do $block$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'game_versions' and column_name = 'steam_app_id'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'game_versions' and column_name = 'verified_build_id'
  ) then
    execute $sql$
      update public.game_versions
      set steam_app_id = '3624140', verified_build_id = '25275561'
      where game_slug = 'wanderburg'
        and row(steam_app_id, verified_build_id) is distinct from row('3624140', '25275561')
    $sql$;
  end if;
end;
$block$;

alter table public.comments drop constraint if exists comments_game_slug_check_wanderburg;
alter table public.comments add constraint comments_game_slug_check_wanderburg
check (game_slug = any (array[
  'scrap-mechanic','no-mans-sky','ready-or-not','astroneer','shapez-2',
  'prince-of-persia-the-lost-crown','arms-of-god','kingdom-rush-vengeance',
  'sleeping-dogs','vacation-cafe-simulator','bombanana','breathedge-2',
  'parcel-simulator','the-spell-brigade','warhounds','powerwash-simulator-2',
  'hearth-and-hamlet','kynseed','alchemy-factory','e-shop-tycoon',
  'yet-another-zombie-survivors','cloverpit','timberborn','restory','leafy-corner',
  'bookshop-simulator','wanderburg','factory-planner','streamer-life-simulator-2',
  'the-universim','youtubers-life-2','catmailco'
]::text[])) not valid;
alter table public.comments validate constraint comments_game_slug_check_wanderburg;
alter table public.comments drop constraint if exists comments_game_slug_check;
alter table public.comments rename constraint comments_game_slug_check_wanderburg to comments_game_slug_check;

alter table public.bug_reports drop constraint if exists bug_reports_game_slug_check_wanderburg;
alter table public.bug_reports add constraint bug_reports_game_slug_check_wanderburg
check (game_slug = any (array[
  'scrap-mechanic','no-mans-sky','ready-or-not','astroneer','shapez-2',
  'prince-of-persia-the-lost-crown','arms-of-god','kingdom-rush-vengeance',
  'sleeping-dogs','vacation-cafe-simulator','bombanana','breathedge-2',
  'parcel-simulator','the-spell-brigade','warhounds','powerwash-simulator-2',
  'hearth-and-hamlet','kynseed','alchemy-factory','e-shop-tycoon',
  'yet-another-zombie-survivors','cloverpit','timberborn','restory','leafy-corner',
  'bookshop-simulator','wanderburg','factory-planner','streamer-life-simulator-2',
  'the-universim','youtubers-life-2','catmailco'
]::text[])) not valid;
alter table public.bug_reports validate constraint bug_reports_game_slug_check_wanderburg;
alter table public.bug_reports drop constraint if exists bug_reports_game_slug_check;
alter table public.bug_reports rename constraint bug_reports_game_slug_check_wanderburg to bug_reports_game_slug_check;

alter table public.game_ratings drop constraint if exists game_ratings_game_slug_check_wanderburg;
alter table public.game_ratings add constraint game_ratings_game_slug_check_wanderburg
check (game_slug = any (array[
  'scrap-mechanic','no-mans-sky','ready-or-not','astroneer','shapez-2',
  'prince-of-persia-the-lost-crown','arms-of-god','kingdom-rush-vengeance',
  'sleeping-dogs','vacation-cafe-simulator','bombanana','breathedge-2',
  'parcel-simulator','the-spell-brigade','warhounds','powerwash-simulator-2',
  'hearth-and-hamlet','kynseed','alchemy-factory','e-shop-tycoon',
  'yet-another-zombie-survivors','cloverpit','timberborn','restory','leafy-corner',
  'bookshop-simulator','wanderburg','factory-planner','streamer-life-simulator-2',
  'the-universim','youtubers-life-2','catmailco'
]::text[])) not valid;
alter table public.game_ratings validate constraint game_ratings_game_slug_check_wanderburg;
alter table public.game_ratings drop constraint if exists game_ratings_game_slug_check;
alter table public.game_ratings rename constraint game_ratings_game_slug_check_wanderburg to game_ratings_game_slug_check;

alter table public.download_totals drop constraint if exists download_totals_game_slug_check_wanderburg;
alter table public.download_totals add constraint download_totals_game_slug_check_wanderburg
check (game_slug = any (array[
  'scrap-mechanic','no-mans-sky','ready-or-not','astroneer','shapez-2',
  'prince-of-persia-the-lost-crown','arms-of-god','kingdom-rush-vengeance',
  'sleeping-dogs','vacation-cafe-simulator','bombanana','breathedge-2',
  'parcel-simulator','the-spell-brigade','warhounds','powerwash-simulator-2',
  'hearth-and-hamlet','kynseed','alchemy-factory','e-shop-tycoon',
  'yet-another-zombie-survivors','cloverpit','timberborn','restory','leafy-corner',
  'bookshop-simulator','wanderburg','factory-planner','streamer-life-simulator-2',
  'the-universim','youtubers-life-2','catmailco'
]::text[])) not valid;
alter table public.download_totals validate constraint download_totals_game_slug_check_wanderburg;
alter table public.download_totals drop constraint if exists download_totals_game_slug_check;
alter table public.download_totals rename constraint download_totals_game_slug_check_wanderburg to download_totals_game_slug_check;

insert into public.download_totals (game_slug, download_count)
values ('wanderburg', 0)
on conflict (game_slug) do nothing;

commit;

-- Kontrola po spusteni:
-- select game_slug, name, translation_version, supported_game_version,
--        translation_updated_at, steam_app_id, verified_build_id
-- from public.game_versions where game_slug = 'wanderburg';
-- select game_slug, download_count from public.download_totals where game_slug = 'wanderburg';
