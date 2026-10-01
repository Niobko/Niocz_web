-- Data update only: no schema/constraints changes and no status override writes.
-- Apply together with the website release. The existing trigger may notify followers.
begin;
do $$
begin
  if not exists (select 1 from public.game_versions where game_slug = 'parcel-simulator') then
    raise exception 'Parcel Simulator is missing from game_versions';
  end if;
end $$;
update public.game_versions
set translation_version = 'v0.2',
    supported_game_version = 'v2.0.1.4',
    translation_updated_at = date '2026-10-01',
    steam_app_id = '2424010',
    verified_build_id = '25586459'
where game_slug = 'parcel-simulator'
  and (translation_version, supported_game_version, translation_updated_at, steam_app_id, verified_build_id)
    is distinct from ('v0.2', 'v2.0.1.4', date '2026-10-01', '2424010', '25586459')
returning game_slug, translation_version, supported_game_version, translation_updated_at, steam_app_id, verified_build_id;
commit;
