-- Data update for the existing E-Shop Tycoon row. No schema migration.
-- Prepared for the administrator; this file has NOT been run on Supabase.
-- Steam public branch 4249850: build 25658096, updated 2026-10-01T16:57:15Z.
-- The owner confirmed translation 0.3 was tested on the current Steam build.
-- Run together with publication to sync followed games, notifications and download gating.
-- Only the old pending override observed during preparation is cleared; newer admin decisions are preserved.
begin;

update public.game_versions
set translation_version = '0.3',
    supported_game_version = 'Patch #7',
    translation_updated_at = date '2026-10-03',
    steam_app_id = '4249850',
    verified_build_id = '25658096'
where game_slug = 'e-shop-tycoon'
  and translation_updated_at <= date '2026-10-03'
  and (translation_version, supported_game_version, translation_updated_at, steam_app_id, verified_build_id)
      is distinct from ('0.3', 'Patch #7', date '2026-10-03', '4249850', '25658096')
returning game_slug, translation_version, supported_game_version, translation_updated_at, steam_app_id, verified_build_id;

-- Confirm the previously observed pending state for this release only.
update public.game_status_overrides
set status = 'functional',
    verified_build = '25658096',
    verified_version = 'Patch #7',
    updated_at = now()
where game_slug = 'e-shop-tycoon'
  and status = 'pending'
  and verified_build = '24971980'
  and verified_version = 'v1.0.8-17ec132'
  and updated_at = timestamptz '2026-10-03T13:50:53.367953+02:00'
  and exists (
    select 1 from public.game_versions
    where game_slug = 'e-shop-tycoon'
      and translation_version = '0.3'
      and translation_updated_at = date '2026-10-03'
      and verified_build_id = '25658096'
  )
returning game_slug, status, verified_build, verified_version;

-- Verify both sources after updating. Later overrides require separate admin review.
select v.game_slug, v.translation_version, v.supported_game_version,
       v.translation_updated_at, v.steam_app_id, v.verified_build_id,
       s.status, s.verified_build, s.verified_version
from public.game_versions v
left join public.game_status_overrides s using (game_slug)
where v.game_slug = 'e-shop-tycoon';

commit;
