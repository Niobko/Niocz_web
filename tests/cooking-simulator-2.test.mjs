import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { applySteamSnapshot } from '../netlify/functions/_lib/steam-builds.mjs';
import { applyAdminGameConfig } from '../netlify/functions/_lib/game-config.mjs';
import { resolveDisplayStatus } from '../netlify/functions/_lib/game-status.mjs';
import { createGameStatusHandler } from '../netlify/functions/game-status.mjs';

const root = new URL('../', import.meta.url);
const read = file => readFileSync(new URL(file, root), 'utf8');
const config = JSON.parse(read('data/game-status.json'));
const slug = 'cooking-simulator-2';

test('Cooking Simulator 2 retains one identity across catalog, download, Steam and community', () => {
  const game = config.games[slug];
  assert.equal(game.appId, '2455360');
  assert.equal(game.supportedVersion, 'v1.23.1f72f80');
  assert.equal(game.verifiedBuildId, null);
  assert.equal(game.currentBuildId, null);
  assert.equal(game.lastSteamUpdate, null);
  assert.equal(game.translationUpdatedAt, '2026-11-16');
  const context = vm.createContext({});
  const script = read('script.js');
  vm.runInContext(script.slice(script.indexOf('const fallbackGameStatuses ='), script.indexOf('const isBuildAwaitingVerification =')) + '\nthis.games=fallbackGameStatuses;', context);
  const { displayStatus, ...entry } = game;
  assert.deepEqual(JSON.parse(JSON.stringify(context.games[slug])), entry);
  const html = read(`${slug}.html`);
  assert.match(html, /data-download data-game="cooking-simulator-2" href="https:\/\/github.com\/Niobko\/NioCZ-Cestiny\/releases\/download\/CookingSimulator2_NioCZ\/Cooking.Simulator.2.NioCZ.zip"/);
  assert.match(html, /<body data-game="cooking-simulator-2">/);
  assert.match(html, /data-comments-list/);
  assert.match(html, /data-download-count/);
  assert.doesNotMatch(html, /inzoi|inZOI|Zoi_|0\.10\.4|Unreal|Localization<\/code>/);
  const gallery = html.match(/aria-label="Galerie screenshotů[^>]*>([\s\S]*?)<\/div>/)[1];
  const files = ['Cooking_hl.jpg', ...[1, 2, 3, 4, 5].map(n => `Cooking_${n}.png`)];
  for (const file of files) {
    assert.ok(existsSync(new URL(`assets/Cooking%20Simulator%202/${file}`, root)));
    assert.ok(gallery.includes(file));
  }
  assert.equal([...gallery.matchAll(/<img /g)].length, 6);
  for (const file of ['index.html', 'preklady.html']) {
    assert.equal([...read(file).matchAll(/data-game-status="cooking-simulator-2"/g)].length, 1);
  }
  assert.match(read('user-system.js'), /'cooking-simulator-2': \{ name: 'Cooking Simulator 2: Better Together', page: 'cooking-simulator-2.html', image: 'assets\/Cooking%20Simulator%202\/Cooking_hl.jpg' \}/);
});

test('Cooking Steam refresh leaves compatibility unverified until an administrator verifies it', async () => {
  // Deliberately synthetic fixture, never persisted as real Steam metadata.
  const sampleBuild = '123456789';
  const snapshot = { schemaVersion: 1, lastCheckedAt: new Date().toISOString(), games: { [slug]: { appId: '2455360', currentBuildId: sampleBuild, lastSteamUpdate: '2026-11-16T10:00:00Z' } } };
  const handler = createGameStatusHandler({
    loadConfig: async () => config,
    openStore: () => ({ get: async () => null, setJSON: async () => {} }),
    fetchManualSnapshot: async games => {
      assert.deepEqual(Object.keys(games), [slug]);
      assert.equal(games[slug].appId, '2455360');
      return snapshot;
    }
  });
  const result = await handler({ httpMethod: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ gameSlug: slug }) });
  assert.equal(result.statusCode, 200);
  const payload = JSON.parse(result.body);
  assert.equal(payload.refresh.fresh, true);
  assert.equal(payload.games[slug].verifiedBuildId, null);
  assert.equal(payload.games[slug].currentBuildId, sampleBuild);
  assert.equal(payload.games[slug].displayStatus.key, 'pending');
  const applied = applySteamSnapshot(config, snapshot);
  for (const other of Object.keys(config.games).filter(s => s !== slug)) assert.deepEqual(applied.games[other], config.games[other]);
  const verified = applyAdminGameConfig(config, [{ game_slug: slug, steam_app_id: '2455360', verified_build_id: sampleBuild }]);
  assert.equal(resolveDisplayStatus(applySteamSnapshot(verified, snapshot).games[slug]).key, 'functional');
  assert.equal(resolveDisplayStatus({ ...verified.games[slug], statusOverride: { status: 'broken' } }).key, 'broken');
});
