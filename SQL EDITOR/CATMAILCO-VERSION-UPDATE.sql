-- Optional data update for the existing CatMailCo row. No schema migration.
-- Prepared for the administrator; this file has NOT been run on Supabase.
-- Steam public branch 4380490: build 25651540, updated 2026-10-01T13:31:24Z.
-- game_status_overrides is deliberately preserved, including pending/broken.
begin;

update public.game_versions
set translation_version = '0.3',
    supported_game_version = 'Patch #7',
    translation_updated_at = date '2026-10-02',
    steam_app_id = '4380490',
    verified_build_id = '25651540'
where game_slug = 'catmailco'
  and translation_updated_at <= date '2026-10-02'
  and (translation_version, supported_game_version, translation_updated_at, steam_app_id, verified_build_id)
      is distinct from ('0.3', 'Patch #7', date '2026-10-02', '4380490', '25651540')
returning game_slug, translation_version, supported_game_version, translation_updated_at, steam_app_id, verified_build_id;

commit;
