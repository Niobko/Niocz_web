-- Spusťte samostatně v SQL Editoru existujícího Supabase projektu.
-- Pouze data vydání jedné hry; žádné změny schématu, ověřených buildů či statusů.
-- Stávající triggery upozorní sledující na změnu verze. Opakování je beze změn.
begin;

do $$
begin
  if not exists (select 1 from public.game_versions where game_slug = 'powerwash-simulator-2') then
    raise exception 'PowerWash Simulator 2 není registrován v game_versions.';
  end if;
  if exists (select 1 from public.game_versions where game_slug = 'powerwash-simulator-2'
             and translation_updated_at > date '2026-11-17') then
    raise exception 'Existuje novější vydání; tuto aktualizaci nespouštějte.';
  end if;
end;
$$;

update public.game_versions
set translation_version = 'v0.2',
    supported_game_version = 'v1.3.1',
    translation_updated_at = date '2026-11-17',
    steam_app_id = '2968420'
where game_slug = 'powerwash-simulator-2'
  and translation_updated_at <= date '2026-11-17'
  and row(translation_version, supported_game_version, translation_updated_at, steam_app_id)
      is distinct from row('v0.2'::text, 'v1.3.1'::text, date '2026-11-17', '2968420'::text);

select game_slug, translation_version, supported_game_version, translation_updated_at,
       steam_app_id, verified_build_id
from public.game_versions where game_slug = 'powerwash-simulator-2';

commit;
