-- NioCZ LOC: Cooking Simulator 2: Better Together, 16. 11. 2026.
-- Spusťte celý soubor v Supabase SQL Editoru před zveřejněním hry.
-- Vyžaduje stávající tabulky a sloupce z SUPABASE-ADMIN-GAME-CONFIG.sql.
-- Transakce: při chybě se všechny změny vrátí. Existující řádky se nepřepisují.
-- RLS, oprávnění, RPC ani notifikační triggery se nemění.
-- App ID ověřeno: https://store.steampowered.com/app/2455360/
-- verified_build_id zůstává NULL: kompatibilita konkrétního Steam buildu nebyla ověřena.
-- Nespouštějte poté starší SQL whitelisty jednotlivých her.

begin;

alter table public.comments
  drop constraint if exists comments_game_slug_check_cooking2;

alter table public.comments
  add constraint comments_game_slug_check_cooking2
  check (game_slug in (
    'alchemy-factory',
    'arms-of-god',
    'astroneer',
    'bombanana',
    'bookshop-simulator',
    'breathedge-2',
    'catmailco',
    'cloverpit',
    'e-shop-tycoon',
    'factory-planner',
    'hearth-and-hamlet',
    'cooking-simulator-2',
    'inzoi',
    'kingdom-rush-vengeance',
    'kingdoms-and-castles',
    'kynseed',
    'leafy-corner',
    'no-mans-sky',
    'parcel-simulator',
    'powerwash-simulator-2',
    'prince-of-persia-the-lost-crown',
    'ready-or-not',
    'restory',
    'scrap-mechanic',
    'shapez-2',
    'sleeping-dogs',
    'streamer-life-simulator-2',
    'tcg-card-shop-simulator',
    'the-spell-brigade',
    'the-universim',
    'timberborn',
    'vacation-cafe-simulator',
    'wanderburg',
    'warhounds',
    'yet-another-zombie-survivors',
    'youtubers-life-2'
  )) not valid;

alter table public.comments
  validate constraint comments_game_slug_check_cooking2;

alter table public.comments
  drop constraint if exists comments_game_slug_check;

alter table public.comments
  rename constraint comments_game_slug_check_cooking2 to comments_game_slug_check;

alter table public.bug_reports
  drop constraint if exists bug_reports_game_slug_check_cooking2;

alter table public.bug_reports
  add constraint bug_reports_game_slug_check_cooking2
  check (game_slug in (
    'alchemy-factory',
    'arms-of-god',
    'astroneer',
    'bombanana',
    'bookshop-simulator',
    'breathedge-2',
    'catmailco',
    'cloverpit',
    'e-shop-tycoon',
    'factory-planner',
    'hearth-and-hamlet',
    'cooking-simulator-2',
    'inzoi',
    'kingdom-rush-vengeance',
    'kingdoms-and-castles',
    'kynseed',
    'leafy-corner',
    'no-mans-sky',
    'parcel-simulator',
    'powerwash-simulator-2',
    'prince-of-persia-the-lost-crown',
    'ready-or-not',
    'restory',
    'scrap-mechanic',
    'shapez-2',
    'sleeping-dogs',
    'streamer-life-simulator-2',
    'tcg-card-shop-simulator',
    'the-spell-brigade',
    'the-universim',
    'timberborn',
    'vacation-cafe-simulator',
    'wanderburg',
    'warhounds',
    'yet-another-zombie-survivors',
    'youtubers-life-2'
  )) not valid;

alter table public.bug_reports
  validate constraint bug_reports_game_slug_check_cooking2;

alter table public.bug_reports
  drop constraint if exists bug_reports_game_slug_check;

alter table public.bug_reports
  rename constraint bug_reports_game_slug_check_cooking2 to bug_reports_game_slug_check;

alter table public.game_ratings
  drop constraint if exists game_ratings_game_slug_check_cooking2;

alter table public.game_ratings
  add constraint game_ratings_game_slug_check_cooking2
  check (game_slug in (
    'alchemy-factory',
    'arms-of-god',
    'astroneer',
    'bombanana',
    'bookshop-simulator',
    'breathedge-2',
    'catmailco',
    'cloverpit',
    'e-shop-tycoon',
    'factory-planner',
    'hearth-and-hamlet',
    'cooking-simulator-2',
    'inzoi',
    'kingdom-rush-vengeance',
    'kingdoms-and-castles',
    'kynseed',
    'leafy-corner',
    'no-mans-sky',
    'parcel-simulator',
    'powerwash-simulator-2',
    'prince-of-persia-the-lost-crown',
    'ready-or-not',
    'restory',
    'scrap-mechanic',
    'shapez-2',
    'sleeping-dogs',
    'streamer-life-simulator-2',
    'tcg-card-shop-simulator',
    'the-spell-brigade',
    'the-universim',
    'timberborn',
    'vacation-cafe-simulator',
    'wanderburg',
    'warhounds',
    'yet-another-zombie-survivors',
    'youtubers-life-2'
  )) not valid;

alter table public.game_ratings
  validate constraint game_ratings_game_slug_check_cooking2;

alter table public.game_ratings
  drop constraint if exists game_ratings_game_slug_check;

alter table public.game_ratings
  rename constraint game_ratings_game_slug_check_cooking2 to game_ratings_game_slug_check;

alter table public.download_totals
  drop constraint if exists download_totals_game_slug_check_cooking2;

alter table public.download_totals
  add constraint download_totals_game_slug_check_cooking2
  check (game_slug in (
    'alchemy-factory',
    'arms-of-god',
    'astroneer',
    'bombanana',
    'bookshop-simulator',
    'breathedge-2',
    'catmailco',
    'cloverpit',
    'e-shop-tycoon',
    'factory-planner',
    'hearth-and-hamlet',
    'cooking-simulator-2',
    'inzoi',
    'kingdom-rush-vengeance',
    'kingdoms-and-castles',
    'kynseed',
    'leafy-corner',
    'no-mans-sky',
    'parcel-simulator',
    'powerwash-simulator-2',
    'prince-of-persia-the-lost-crown',
    'ready-or-not',
    'restory',
    'scrap-mechanic',
    'shapez-2',
    'sleeping-dogs',
    'streamer-life-simulator-2',
    'tcg-card-shop-simulator',
    'the-spell-brigade',
    'the-universim',
    'timberborn',
    'vacation-cafe-simulator',
    'wanderburg',
    'warhounds',
    'yet-another-zombie-survivors',
    'youtubers-life-2'
  )) not valid;

alter table public.download_totals
  validate constraint download_totals_game_slug_check_cooking2;

alter table public.download_totals
  drop constraint if exists download_totals_game_slug_check;

alter table public.download_totals
  rename constraint download_totals_game_slug_check_cooking2 to download_totals_game_slug_check;

-- Favorites, sledování a upozornění mají cizí klíč do game_versions.
-- Stávající RLS, admin RPC a notifikační triggery zůstávají beze změny.
insert into public.game_versions
  (game_slug, name, translation_version, supported_game_version, translation_updated_at, steam_app_id, verified_build_id)
values ('cooking-simulator-2', 'Cooking Simulator 2: Better Together', 'v1.0', 'v1.23.1f72f80', '2026-11-16', '2455360', null)
on conflict (game_slug) do nothing;

-- Stávající register_download(text) zvyšuje tento řádek podle slugu.
insert into public.download_totals (game_slug, download_count)
values ('cooking-simulator-2', 0)
on conflict (game_slug) do nothing;

commit;
