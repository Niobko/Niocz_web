import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const detail = readFileSync(new URL("e-shop-tycoon.html", root), "utf8");
const index = readFileSync(new URL("index.html", root), "utf8");
const translations = readFileSync(new URL("preklady.html", root), "utf8");
const sitemap = readFileSync(new URL("sitemap.xml", root), "utf8");
const status = JSON.parse(readFileSync(new URL("data/game-status.json", root), "utf8"));
const databaseMigration = readFileSync(new URL("SQL EDITOR/SUPABASE-E-SHOP-TYCOON.sql", root), "utf8");

test("E-Shop Tycoon is registered across the public site", () => {
  assert.match(index, /href="e-shop-tycoon\.html"/);
  assert.match(translations, /data-game-status="e-shop-tycoon"/);
  assert.match(sitemap, /https:\/\/nioczloc\.com\/e-shop-tycoon\.html/);
  assert.equal(status.games["e-shop-tycoon"].appId, "4249850");
  assert.equal(status.games["e-shop-tycoon"].supportedVersion, "Patch #7");
  assert.match(databaseMigration, /'e-shop-tycoon'/);
  assert.match(databaseMigration, /alter table public\.comments/i);
  assert.match(databaseMigration, /alter table public\.game_ratings/i);
  assert.match(databaseMigration, /insert into public\.download_totals/i);
  assert.match(databaseMigration, /download_totals_game_slug_check_v2/i);
  assert.match(databaseMigration, /validate constraint download_totals_game_slug_check_v2/i);
  assert.match(databaseMigration, /on conflict \(game_slug\) do nothing/i);
  assert.match(databaseMigration, /create function public\.register_download\(requested_game_slug text\)/i);
  assert.match(databaseMigration, /set download_count = download_count \+ 1/i);
  assert.match(databaseMigration, /grant execute on function public\.register_download\(text\) to anon, authenticated/i);
});

test("E-Shop Tycoon detail keeps every shared community and download hook", () => {
  assert.match(detail, /<body data-game="e-shop-tycoon">/);
  assert.match(detail, /data-comments-list/);
  assert.match(detail, /data-download data-game="e-shop-tycoon"/);
  assert.match(detail, /data-download-count/);
  assert.match(detail, /E-Shop\.Tycoon_NioCZ\.zip/);
  assert.match(detail, /EShop_Tycoon_CZ_P\.pak/);
});

test("the supplied cover and five gallery images are present", () => {
  for (const name of ["eShop_hl.png", "eShop_1.png", "eShop_2.png", "eShop_3.png", "eShop_4.png", "eShop_5.png"]) {
    assert.ok(existsSync(new URL(`assets/eShop/${name}`, root)), `${name} must exist`);
  }
  assert.equal([...detail.matchAll(/assets\/eShop\/eShop_[1-5]\.png/g)].length, 10);
});


test("E-Shop release metadata and fallback agree without duplicating the game", async () => {
  const vm = await import('node:vm');
  const script = readFileSync(new URL('script.js', root), 'utf8');
  const context = vm.createContext({});
  vm.runInContext(script.slice(script.indexOf('const fallbackGameStatuses ='), script.indexOf('const isBuildAwaitingVerification =')) + '\nthis.games = fallbackGameStatuses;', context);
  const game = status.games['e-shop-tycoon'];
  const fallback = JSON.parse(JSON.stringify(context.games['e-shop-tycoon']));
  const { displayStatus, ...configured } = game;
  assert.deepEqual(fallback, configured);
  assert.equal(game.translationVersion, '0.3');
  assert.equal(game.translationUpdatedAt, '2026-10-03');
  assert.equal(game.verifiedBuildId, '25658096');
  assert.equal(game.currentBuildId, '25658096');
  assert.equal(game.lastSteamUpdate, '2026-10-01T16:57:15.000Z');
  assert.equal(Object.keys(status.games).length, 35);
  const news = index.match(/<a class="latest-game-card" href="e-shop-tycoon\.html"[^>]*>[\s\S]*?<\/a>/g);
  assert.equal(news.length, 1);
  const card = translations.match(/<article class="translation-card reveal">(?:(?!<\/article>)[\s\S])*?href="e-shop-tycoon\.html"[\s\S]*?<\/article>/)[0];
  for (const content of [news[0], card, detail]) {
    assert.match(content, /0\.3/);
    assert.match(content, /Patch #7/);
    assert.match(content, /datetime="2026-10-03">3\. 10\. 2026/);
  }
  assert.match(detail, /0\.19 MB/);
  assert.match(sitemap, /e-shop-tycoon\.html<\/loc>\s*<lastmod>2026-10-08<\/lastmod>/);
  const steps = detail.match(/<ol class="steps install-steps">([\s\S]*?)<\/ol>/)[1];
  assert.equal([...steps.matchAll(/<li>/g)].length, 6);
  assert.match(steps, /install\.exe/);
  assert.match(steps, /Procházet \(Browse\)/);
  assert.match(steps, /<b>Čeština<\/b>/);
  assert.match(detail, /SmartScreen/);
  assert.doesNotMatch(detail, /EShopNioCZ_P|English|83\.8 kB|v1\.0\.8/);
});

test("E-Shop Steam refresh preserves Current Build and gates a newer unverified build", async () => {
  const { applySteamSnapshot } = await import('../netlify/functions/_lib/steam-builds.mjs');
  const { applyAdminGameConfig } = await import('../netlify/functions/_lib/game-config.mjs');
  const { resolveDisplayStatus } = await import('../netlify/functions/_lib/game-status.mjs');
  const slug = 'e-shop-tycoon';
  const game = status.games[slug];
  assert.equal(resolveDisplayStatus(game).key, 'functional');
  const refreshed = applySteamSnapshot(status, { games: { [slug]: { appId: '4249850', currentBuildId: '25658097', lastSteamUpdate: '2026-10-04T10:00:00Z' } } });
  assert.equal(refreshed.games[slug].verifiedBuildId, '25658096');
  assert.equal(refreshed.games[slug].currentBuildId, '25658097');
  assert.equal(refreshed.games[slug].lastSteamUpdate, '2026-10-04T10:00:00.000Z');
  assert.equal(resolveDisplayStatus(refreshed.games[slug]).key, 'pending');
  for (const other of Object.keys(status.games).filter(key => key !== slug)) {
    assert.deepEqual(refreshed.games[other], status.games[other]);
  }
  const admin = applyAdminGameConfig(status, [{ game_slug: slug, translation_updated_at: '2026-08-30', supported_game_version: 'v1.0.8-17ec132', verified_build_id: '24775292', steam_app_id: '4249850' }]).games[slug];
  assert.equal(admin.supportedVersion, 'Patch #7');
  assert.equal(admin.verifiedBuildId, '24775292');
  assert.equal(admin.verifiedBuildSource, 'database');
  assert.equal(resolveDisplayStatus({...game, statusOverride:{status:'broken'}}).key, 'broken');
});
