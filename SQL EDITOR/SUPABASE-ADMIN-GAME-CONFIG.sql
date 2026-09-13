-- NioCZ: administracne udaje hry bez uprav frontendoveho alebo Netlify kodu.
-- Spustit po SUPABASE-USER-SYSTEM.sql v Supabase SQL Editore.

begin;

alter table public.game_versions
  add column if not exists steam_app_id text,
  add column if not exists verified_build_id text;

alter table public.game_versions
  drop constraint if exists game_versions_steam_app_id_check,
  drop constraint if exists game_versions_verified_build_id_check;

alter table public.game_versions
  add constraint game_versions_steam_app_id_check
    check (steam_app_id is null or steam_app_id ~ '^[0-9]{1,20}$'),
  add constraint game_versions_verified_build_id_check
    check (verified_build_id is null or verified_build_id ~ '^[0-9]{1,30}$');

comment on column public.game_versions.steam_app_id is
  'Administratorem nastavene Steam App ID. NULL znamena pouzit statickou zalozni konfiguraci.';
comment on column public.game_versions.verified_build_id is
  'Administratorem overeny Steam public build. Latest build a datum Steam updatu se nacitaji automaticky.';

drop function if exists public.admin_update_game_version(text, text, text, date);

create or replace function public.admin_update_game_version(
  requested_game_slug text,
  requested_translation_version text,
  requested_supported_game_version text,
  requested_translation_updated_at date,
  requested_steam_app_id text,
  requested_verified_build_id text default null
)
returns public.game_versions
language plpgsql
security definer
set search_path = ''
as $function$
declare
  saved public.game_versions%rowtype;
  normalized_steam_app_id text := nullif(btrim(requested_steam_app_id), '');
  normalized_verified_build_id text := nullif(btrim(requested_verified_build_id), '');
begin
  if not private.is_admin() then
    raise exception 'Administrator permission is required.' using errcode = '42501';
  end if;
  if nullif(btrim(requested_translation_version), '') is null or char_length(btrim(requested_translation_version)) > 80 then
    raise exception 'Invalid translation version.' using errcode = '22023';
  end if;
  if nullif(btrim(requested_supported_game_version), '') is null or char_length(btrim(requested_supported_game_version)) > 120 then
    raise exception 'Invalid supported game version.' using errcode = '22023';
  end if;
  if requested_translation_updated_at is null then
    raise exception 'Translation update date is required.' using errcode = '22023';
  end if;
  if normalized_steam_app_id is null or normalized_steam_app_id !~ '^[0-9]{1,20}$' then
    raise exception 'Invalid Steam App ID.' using errcode = '22023';
  end if;
  if normalized_verified_build_id is not null and normalized_verified_build_id !~ '^[0-9]{1,30}$' then
    raise exception 'Invalid verified build ID.' using errcode = '22023';
  end if;

  update public.game_versions
  set translation_version = btrim(requested_translation_version),
      supported_game_version = btrim(requested_supported_game_version),
      translation_updated_at = requested_translation_updated_at,
      steam_app_id = normalized_steam_app_id,
      verified_build_id = normalized_verified_build_id
  where game_slug = requested_game_slug
    and row(
      translation_version,
      supported_game_version,
      translation_updated_at,
      steam_app_id,
      verified_build_id
    ) is distinct from row(
      btrim(requested_translation_version),
      btrim(requested_supported_game_version),
      requested_translation_updated_at,
      normalized_steam_app_id,
      normalized_verified_build_id
    )
  returning * into saved;

  if saved.game_slug is null then
    select * into saved from public.game_versions where game_slug = requested_game_slug;
  end if;
  if saved.game_slug is null then
    raise exception 'Unknown game slug.' using errcode = '22023';
  end if;
  return saved;
end;
$function$;

revoke all on function public.admin_update_game_version(text, text, text, date, text, text) from public, anon, authenticated;
grant execute on function public.admin_update_game_version(text, text, text, date, text, text) to authenticated;

commit;

-- Volitelna kontrola po spusteni:
-- select game_slug, steam_app_id, verified_build_id, supported_game_version
-- from public.game_versions order by game_slug;
