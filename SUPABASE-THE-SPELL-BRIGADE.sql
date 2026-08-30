-- NioCZ LOC: The Spell Brigade
-- Spusťte celý soubor jednou v Supabase -> SQL Editor -> Run.
-- Migrace rozšíří povolené slugy pro komentáře, hlášení chyb,
-- hodnocení a počítadlo stažení. Je bezpečné ji spustit opakovaně.

begin;

alter table public.comments
  drop constraint if exists comments_game_slug_check_v6;

alter table public.comments
  add constraint comments_game_slug_check_v6
  check (game_slug in (
    'alchemy-factory',
    'bookshop-simulator',
    'catmailco',
    'cloverpit',
    'e-shop-tycoon',
    'factory-planner',
    'hearth-and-hamlet',
    'kynseed',
    'leafy-corner',
    'powerwash-simulator-2',
    'restory',
    'streamer-life-simulator-2',
    'the-spell-brigade',
    'the-universim',
    'timberborn',
    'warhounds',
    'yet-another-zombie-survivors',
    'youtubers-life-2'
  )) not valid;

alter table public.comments
  validate constraint comments_game_slug_check_v6;

alter table public.comments
  drop constraint if exists comments_game_slug_check;

alter table public.comments
  rename constraint comments_game_slug_check_v6
  to comments_game_slug_check;

alter table public.bug_reports
  drop constraint if exists bug_reports_game_slug_check_v6;

alter table public.bug_reports
  add constraint bug_reports_game_slug_check_v6
  check (game_slug in (
    'alchemy-factory',
    'bookshop-simulator',
    'catmailco',
    'cloverpit',
    'e-shop-tycoon',
    'factory-planner',
    'hearth-and-hamlet',
    'kynseed',
    'leafy-corner',
    'powerwash-simulator-2',
    'restory',
    'streamer-life-simulator-2',
    'the-spell-brigade',
    'the-universim',
    'timberborn',
    'warhounds',
    'yet-another-zombie-survivors',
    'youtubers-life-2'
  )) not valid;

alter table public.bug_reports
  validate constraint bug_reports_game_slug_check_v6;

alter table public.bug_reports
  drop constraint if exists bug_reports_game_slug_check;

alter table public.bug_reports
  rename constraint bug_reports_game_slug_check_v6
  to bug_reports_game_slug_check;

alter table public.game_ratings
  drop constraint if exists game_ratings_game_slug_check_v6;

alter table public.game_ratings
  add constraint game_ratings_game_slug_check_v6
  check (game_slug = any (array[
    'alchemy-factory',
    'bookshop-simulator',
    'catmailco',
    'cloverpit',
    'e-shop-tycoon',
    'factory-planner',
    'hearth-and-hamlet',
    'kynseed',
    'leafy-corner',
    'powerwash-simulator-2',
    'restory',
    'streamer-life-simulator-2',
    'the-spell-brigade',
    'the-universim',
    'timberborn',
    'warhounds',
    'yet-another-zombie-survivors',
    'youtubers-life-2'
  ]::text[])) not valid;

alter table public.game_ratings
  validate constraint game_ratings_game_slug_check_v6;

alter table public.game_ratings
  drop constraint if exists game_ratings_game_slug_check;

alter table public.game_ratings
  rename constraint game_ratings_game_slug_check_v6
  to game_ratings_game_slug_check;

alter table public.download_totals
  drop constraint if exists download_totals_game_slug_check_v6;

alter table public.download_totals
  add constraint download_totals_game_slug_check_v6
  check (game_slug in (
    'alchemy-factory',
    'bookshop-simulator',
    'catmailco',
    'cloverpit',
    'e-shop-tycoon',
    'factory-planner',
    'hearth-and-hamlet',
    'kynseed',
    'leafy-corner',
    'powerwash-simulator-2',
    'restory',
    'streamer-life-simulator-2',
    'the-spell-brigade',
    'the-universim',
    'timberborn',
    'warhounds',
    'yet-another-zombie-survivors',
    'youtubers-life-2'
  )) not valid;

alter table public.download_totals
  validate constraint download_totals_game_slug_check_v6;

alter table public.download_totals
  drop constraint if exists download_totals_game_slug_check;

alter table public.download_totals
  rename constraint download_totals_game_slug_check_v6
  to download_totals_game_slug_check;

insert into public.download_totals (game_slug, download_count)
values ('the-spell-brigade', 0)
on conflict (game_slug) do nothing;

create or replace function public.register_download(requested_game_slug text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.download_totals
  set download_count = download_count + 1
  where game_slug = requested_game_slug;

  if not found then
    raise exception 'Unknown game slug: %', requested_game_slug;
  end if;
end;
$$;

revoke all on function public.register_download(text) from public;
grant execute on function public.register_download(text) to anon, authenticated;

commit;
