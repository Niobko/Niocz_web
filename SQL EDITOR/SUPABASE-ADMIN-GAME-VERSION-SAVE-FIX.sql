-- NioCZ LOC: oprava a overeni admin ukladani verzi her.
-- Spustte cely soubor v Supabase SQL Editoru. Lze jej spustit opakovane.

begin;

alter table public.game_versions
  add column if not exists steam_app_id text,
  add column if not exists verified_build_id text;

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
  normalized_slug text := lower(btrim(requested_game_slug));
  normalized_translation_version text := btrim(requested_translation_version);
  normalized_supported_game_version text := btrim(requested_supported_game_version);
  normalized_steam_app_id text := nullif(btrim(requested_steam_app_id), '');
  normalized_verified_build_id text := nullif(btrim(requested_verified_build_id), '');
  saved public.game_versions%rowtype;
begin
  if auth.uid() is null or not private.is_admin() then
    raise exception 'Administrator permission is required.' using errcode = '42501';
  end if;
  if normalized_slug is null or normalized_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Invalid game slug.' using errcode = '22023';
  end if;
  if normalized_translation_version = '' or char_length(normalized_translation_version) > 80 then
    raise exception 'Invalid translation version.' using errcode = '22023';
  end if;
  if normalized_supported_game_version = '' or char_length(normalized_supported_game_version) > 120 then
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

  if not exists (select 1 from public.game_versions where game_slug = normalized_slug) then
    raise exception 'Unknown game slug: %', normalized_slug using errcode = 'P0002';
  end if;

  update public.game_versions
  set translation_version = normalized_translation_version,
      supported_game_version = normalized_supported_game_version,
      translation_updated_at = requested_translation_updated_at,
      steam_app_id = normalized_steam_app_id,
      verified_build_id = normalized_verified_build_id
  where game_slug = normalized_slug
    and row(translation_version, supported_game_version, translation_updated_at, steam_app_id, verified_build_id)
      is distinct from
        row(normalized_translation_version, normalized_supported_game_version, requested_translation_updated_at,
            normalized_steam_app_id, normalized_verified_build_id)
  returning * into saved;

  -- Stejne hodnoty jsou idempotentni. I v tomto pripade vratime skutecny radek,
  -- ktery frontend nasledne znovu nacte a porovna s formularem.
  if saved.game_slug is null then
    select * into strict saved from public.game_versions where game_slug = normalized_slug;
  end if;
  return saved;
end;
$function$;

revoke all on function public.admin_update_game_version(text, text, text, date, text, text)
  from public, anon, authenticated;
grant execute on function public.admin_update_game_version(text, text, text, date, text, text)
  to authenticated;

-- game_versions je verejne citelna kvuli webu, zapis klienta je zakazan.
-- Jediny zapis vede pres RPC vyse, ktere kontroluje private.is_admin().
alter table public.game_versions enable row level security;
drop policy if exists "Game versions are publicly readable" on public.game_versions;
create policy "Game versions are publicly readable" on public.game_versions
for select to anon, authenticated using (true);
revoke all on table public.game_versions from public, anon, authenticated;
grant select on table public.game_versions to anon, authenticated;

commit;

-- Kontrola po spusteni (nahraďte slug podle potreby):
-- select game_slug, translation_version, supported_game_version,
--        translation_updated_at, steam_app_id, verified_build_id, updated_at
-- from public.game_versions
-- where game_slug = 'alchemy-factory';
