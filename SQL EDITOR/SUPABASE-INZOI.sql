-- NioCZ LOC: inZOI. Spusťte celý soubor v Supabase SQL Editoru před zveřejněním hry.
-- Bezpečné opakování: existující verze, stažení a oprávnění se nepřepisují.
-- Steam App ID 2456740; veřejný build 25336085, 2026-09-16T06:00:09Z.
-- Ověřeno přes Steam PICS 4. 10. 2026; hotfix 0.10.4:
-- https://playinzoi.com/en/news/11110 (20260915.15331.W, shodné s dodaným screenshotem).

begin;

alter table public.comments
  drop constraint if exists comments_game_slug_check_inzoi;

alter table public.comments
  add constraint comments_game_slug_check_inzoi
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
  validate constraint comments_game_slug_check_inzoi;

alter table public.comments
  drop constraint if exists comments_game_slug_check;

alter table public.comments
  rename constraint comments_game_slug_check_inzoi to comments_game_slug_check;

alter table public.bug_reports
  drop constraint if exists bug_reports_game_slug_check_inzoi;

alter table public.bug_reports
  add constraint bug_reports_game_slug_check_inzoi
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
  validate constraint bug_reports_game_slug_check_inzoi;

alter table public.bug_reports
  drop constraint if exists bug_reports_game_slug_check;

alter table public.bug_reports
  rename constraint bug_reports_game_slug_check_inzoi to bug_reports_game_slug_check;

alter table public.game_ratings
  drop constraint if exists game_ratings_game_slug_check_inzoi;

alter table public.game_ratings
  add constraint game_ratings_game_slug_check_inzoi
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
  validate constraint game_ratings_game_slug_check_inzoi;

alter table public.game_ratings
  drop constraint if exists game_ratings_game_slug_check;

alter table public.game_ratings
  rename constraint game_ratings_game_slug_check_inzoi to game_ratings_game_slug_check;

alter table public.download_totals
  drop constraint if exists download_totals_game_slug_check_inzoi;

alter table public.download_totals
  add constraint download_totals_game_slug_check_inzoi
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
  validate constraint download_totals_game_slug_check_inzoi;

alter table public.download_totals
  drop constraint if exists download_totals_game_slug_check;

alter table public.download_totals
  rename constraint download_totals_game_slug_check_inzoi to download_totals_game_slug_check;

-- Favorites, sledování a upozornění mají cizí klíč do game_versions.
-- Stávající RLS, admin RPC a notifikační triggery zůstávají beze změny.
insert into public.game_versions
  (game_slug, name, translation_version, supported_game_version, translation_updated_at, steam_app_id, verified_build_id)
values ('inzoi', 'inZOI', 'v1.0', '0.10.4', '2026-10-04', '2456740', '25336085')
on conflict (game_slug) do nothing;

-- Stávající register_download(text) zvyšuje tento řádek podle slugu.
insert into public.download_totals (game_slug, download_count)
values ('inzoi', 0)
on conflict (game_slug) do nothing;

commit;
