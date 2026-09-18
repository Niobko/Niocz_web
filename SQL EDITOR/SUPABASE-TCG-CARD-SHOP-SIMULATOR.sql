-- NioCZ LOC: zapojení TCG Card Shop Simulator do všech uložených herních funkcí.
-- Spusťte jednou v Supabase -> SQL Editor -> Run.
-- Skript je idempotentní a neobsahuje žádný service_role klíč.

begin;

insert into public.game_versions (
  game_slug, name, translation_version, supported_game_version, translation_updated_at
)
values ('tcg-card-shop-simulator', 'TCG Card Shop Simulator', 'v1.0', 'v1.02', date '2026-09-18')
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
      set steam_app_id = '3070070', verified_build_id = '25381942'
      where game_slug = 'tcg-card-shop-simulator'
        and row(steam_app_id, verified_build_id) is distinct from row('3070070', '25381942')
    $sql$;
  end if;
end;
$block$;

alter table public.comments drop constraint if exists comments_game_slug_check_tcg;
alter table public.comments add constraint comments_game_slug_check_tcg
check (game_slug = any (array[
  'scrap-mechanic','no-mans-sky','ready-or-not','astroneer','shapez-2',
  'prince-of-persia-the-lost-crown','arms-of-god','kingdom-rush-vengeance',
  'sleeping-dogs','vacation-cafe-simulator','bombanana','breathedge-2',
  'parcel-simulator','the-spell-brigade','warhounds','powerwash-simulator-2',
  'hearth-and-hamlet','kynseed','alchemy-factory','e-shop-tycoon',
  'yet-another-zombie-survivors','cloverpit','timberborn','restory','leafy-corner',
  'bookshop-simulator','wanderburg','tcg-card-shop-simulator','factory-planner',
  'streamer-life-simulator-2','the-universim','youtubers-life-2','catmailco'
]::text[])) not valid;
alter table public.comments validate constraint comments_game_slug_check_tcg;
alter table public.comments drop constraint if exists comments_game_slug_check;
alter table public.comments rename constraint comments_game_slug_check_tcg to comments_game_slug_check;

alter table public.bug_reports drop constraint if exists bug_reports_game_slug_check_tcg;
alter table public.bug_reports add constraint bug_reports_game_slug_check_tcg
check (game_slug = any (array[
  'scrap-mechanic','no-mans-sky','ready-or-not','astroneer','shapez-2',
  'prince-of-persia-the-lost-crown','arms-of-god','kingdom-rush-vengeance',
  'sleeping-dogs','vacation-cafe-simulator','bombanana','breathedge-2',
  'parcel-simulator','the-spell-brigade','warhounds','powerwash-simulator-2',
  'hearth-and-hamlet','kynseed','alchemy-factory','e-shop-tycoon',
  'yet-another-zombie-survivors','cloverpit','timberborn','restory','leafy-corner',
  'bookshop-simulator','wanderburg','tcg-card-shop-simulator','factory-planner',
  'streamer-life-simulator-2','the-universim','youtubers-life-2','catmailco'
]::text[])) not valid;
alter table public.bug_reports validate constraint bug_reports_game_slug_check_tcg;
alter table public.bug_reports drop constraint if exists bug_reports_game_slug_check;
alter table public.bug_reports rename constraint bug_reports_game_slug_check_tcg to bug_reports_game_slug_check;

alter table public.game_ratings drop constraint if exists game_ratings_game_slug_check_tcg;
alter table public.game_ratings add constraint game_ratings_game_slug_check_tcg
check (game_slug = any (array[
  'scrap-mechanic','no-mans-sky','ready-or-not','astroneer','shapez-2',
  'prince-of-persia-the-lost-crown','arms-of-god','kingdom-rush-vengeance',
  'sleeping-dogs','vacation-cafe-simulator','bombanana','breathedge-2',
  'parcel-simulator','the-spell-brigade','warhounds','powerwash-simulator-2',
  'hearth-and-hamlet','kynseed','alchemy-factory','e-shop-tycoon',
  'yet-another-zombie-survivors','cloverpit','timberborn','restory','leafy-corner',
  'bookshop-simulator','wanderburg','tcg-card-shop-simulator','factory-planner',
  'streamer-life-simulator-2','the-universim','youtubers-life-2','catmailco'
]::text[])) not valid;
alter table public.game_ratings validate constraint game_ratings_game_slug_check_tcg;
alter table public.game_ratings drop constraint if exists game_ratings_game_slug_check;
alter table public.game_ratings rename constraint game_ratings_game_slug_check_tcg to game_ratings_game_slug_check;

alter table public.download_totals drop constraint if exists download_totals_game_slug_check_tcg;
alter table public.download_totals add constraint download_totals_game_slug_check_tcg
check (game_slug = any (array[
  'scrap-mechanic','no-mans-sky','ready-or-not','astroneer','shapez-2',
  'prince-of-persia-the-lost-crown','arms-of-god','kingdom-rush-vengeance',
  'sleeping-dogs','vacation-cafe-simulator','bombanana','breathedge-2',
  'parcel-simulator','the-spell-brigade','warhounds','powerwash-simulator-2',
  'hearth-and-hamlet','kynseed','alchemy-factory','e-shop-tycoon',
  'yet-another-zombie-survivors','cloverpit','timberborn','restory','leafy-corner',
  'bookshop-simulator','wanderburg','tcg-card-shop-simulator','factory-planner',
  'streamer-life-simulator-2','the-universim','youtubers-life-2','catmailco'
]::text[])) not valid;
alter table public.download_totals validate constraint download_totals_game_slug_check_tcg;
alter table public.download_totals drop constraint if exists download_totals_game_slug_check;
alter table public.download_totals rename constraint download_totals_game_slug_check_tcg to download_totals_game_slug_check;

insert into public.download_totals (game_slug, download_count)
values ('tcg-card-shop-simulator', 0)
on conflict (game_slug) do nothing;

commit;

-- user_followed_games a user_favorite_games odkazují na game_versions(game_slug),
-- takže vložený řádek hru automaticky povolí i pro sledování a oblíbené.
-- Kontrola po spuštění:
-- select game_slug, name, translation_version, supported_game_version,
--        translation_updated_at, steam_app_id, verified_build_id
-- from public.game_versions where game_slug = 'tcg-card-shop-simulator';
-- select game_slug, download_count from public.download_totals
-- where game_slug = 'tcg-card-shop-simulator';
