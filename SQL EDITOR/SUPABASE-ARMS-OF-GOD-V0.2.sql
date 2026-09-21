-- NioCZ LOC: cílená aktualizace Arms of God v existující tabulce game_versions.
-- Spusťte po SUPABASE-ADMIN-GAME-CONFIG.sql. Skript nemění constraints ani jiné hry.

begin;

update public.game_versions
set translation_version = 'v0.2',
    supported_game_version = 'v0.618',
    translation_updated_at = date '2026-09-21',
    steam_app_id = '3100310',
    verified_build_id = '25392212',
    updated_at = now()
where game_slug = 'arms-of-god'
  and row(
    translation_version,
    supported_game_version,
    translation_updated_at,
    steam_app_id,
    verified_build_id
  ) is distinct from row(
    'v0.2',
    'v0.618',
    date '2026-09-21',
    '3100310',
    '25392212'
  );

commit;

-- Kontrola po spuštění:
-- select game_slug, translation_version, supported_game_version,
--        translation_updated_at, steam_app_id, verified_build_id
-- from public.game_versions where game_slug = 'arms-of-god';
