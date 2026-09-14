-- Aktualizace Bookshop Simulator pro profil, sledovane hry a upozorneni.
-- Spustte po SUPABASE-USER-SYSTEM.sql. Volitelne sloupce Steam konfigurace
-- se aktualizuji pouze tehdy, pokud uz je vytvoril SUPABASE-ADMIN-GAME-CONFIG.sql.

begin;

insert into public.game_versions (
  game_slug, name, translation_version, supported_game_version, translation_updated_at
)
values (
  'bookshop-simulator', 'Bookshop Simulator', '0.3', 'v1.1.1258', date '2026-09-14'
)
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
      set steam_app_id = '3467040', verified_build_id = '25278775'
      where game_slug = 'bookshop-simulator'
        and row(steam_app_id, verified_build_id) is distinct from row('3467040', '25278775')
    $sql$;
  end if;
end;
$block$;

commit;

-- Kontrola po spusteni:
-- select game_slug, translation_version, supported_game_version, translation_updated_at
-- from public.game_versions where game_slug = 'bookshop-simulator';
