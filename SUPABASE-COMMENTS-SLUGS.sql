-- Spustit ručně v Supabase SQL Editoru.
-- Nový constraint se nejdříve přidá a ověří. Původní constraint zůstává
-- aktivní až do úspěšného ověření nového whitelistu.

begin;

alter table public.comments
  drop constraint if exists comments_game_slug_check_v2;

alter table public.comments
  add constraint comments_game_slug_check_v2
  check (
    game_slug in (
      'alchemy-factory',
      'hearth-and-hamlet',
      'kynseed',
      'powerwash-simulator-2',
      'bookshop-simulator',
      'catmailco',
      'cloverpit',
      'e-shop-tycoon',
      'factory-planner',
      'leafy-corner',
      'restory',
      'streamer-life-simulator-2',
      'the-universim',
      'timberborn',
      'warhounds',
      'yet-another-zombie-survivors',
      'youtubers-life-2'
    )
  ) not valid;

alter table public.comments
  validate constraint comments_game_slug_check_v2;

alter table public.comments
  drop constraint if exists comments_game_slug_check;

alter table public.comments
  rename constraint comments_game_slug_check_v2
  to comments_game_slug_check;

commit;
