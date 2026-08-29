-- Spusťte jednou v Supabase -> SQL Editor -> Run.
-- Rozšíří existující whitelist komentářů a hodnocení o E-Shop Tycoon.

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

alter table public.game_ratings
  drop constraint if exists game_ratings_game_slug_check_v2;

alter table public.game_ratings
  add constraint game_ratings_game_slug_check_v2
  check (game_slug = any (array[
    'alchemy-factory',
    'hearth-and-hamlet',
    'kynseed',
    'powerwash-simulator-2',
    'yet-another-zombie-survivors',
    'e-shop-tycoon',
    'cloverpit',
    'timberborn',
    'restory',
    'leafy-corner',
    'bookshop-simulator',
    'factory-planner',
    'streamer-life-simulator-2',
    'the-universim',
    'youtubers-life-2',
    'catmailco'
  ]::text[])) not valid;

alter table public.game_ratings
  validate constraint game_ratings_game_slug_check_v2;

alter table public.game_ratings
  drop constraint if exists game_ratings_game_slug_check;

alter table public.game_ratings
  rename constraint game_ratings_game_slug_check_v2
  to game_ratings_game_slug_check;

alter table public.download_totals
  drop constraint if exists download_totals_game_slug_check_v2;

alter table public.download_totals
  add constraint download_totals_game_slug_check_v2
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
      'yet-another-zombie-survivors',
      'youtubers-life-2'
    )
  ) not valid;

alter table public.download_totals
  validate constraint download_totals_game_slug_check_v2;

alter table public.download_totals
  drop constraint if exists download_totals_game_slug_check;

alter table public.download_totals
  rename constraint download_totals_game_slug_check_v2
  to download_totals_game_slug_check;

insert into public.download_totals (game_slug, download_count)
values ('e-shop-tycoon', 0)
on conflict (game_slug) do nothing;

drop function if exists public.register_download(text);

create function public.register_download(requested_game_slug text)
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
