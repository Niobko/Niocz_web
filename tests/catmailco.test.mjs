import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { applyAdminGameConfig } from '../netlify/functions/_lib/game-config.mjs';
import { applySteamSnapshot } from '../netlify/functions/_lib/steam-builds.mjs';
import { resolveDisplayStatus } from '../netlify/functions/_lib/game-status.mjs';

const root = new URL('../', import.meta.url);
const read = name => readFileSync(new URL(name, root), 'utf8');
const config = JSON.parse(read('data/game-status.json'));
const game = config.games.catmailco;
const script = read('script.js');
const context = vm.createContext({});
vm.runInContext(script.slice(script.indexOf('const normalizeComparableValue ='), script.indexOf('const isBuildAwaitingVerification ='))
  + script.slice(script.indexOf('const mergeAdminGameConfig ='), script.indexOf('const mergeGameStatusOverrides ='))
  + '\nthis.merge = mergeAdminGameConfig;', context);

test('CatMailCo keeps its existing identity and uses the new release everywhere', () => {
  const detail = read('catmailco.html');
  assert.match(detail, /<body data-game="catmailco">/);
  assert.match(detail, /canonical" href="https:\/\/nioczloc\.com\/catmailco\.html"/);
  assert.match(detail, /Cat\.Mail\.Co_NioCZ\.zip/);
  assert.match(detail, /0\.19 MB/);
  assert.equal(game.appId, '4380490');
  assert.equal(game.translationVersion, '0.3');
  assert.equal(game.supportedVersion, 'Patch #7');
  assert.equal(game.translationUpdatedAt, '2026-10-02');
  assert.equal(game.verifiedBuildId, '25651540');
  assert.equal(game.currentBuildId, '25651540');
  assert.equal(game.lastSteamUpdate, '2026-10-01T13:31:24.000Z');
  for (const [file, pattern] of [
    ['preklady.html', /<article class="translation-card reveal">(?:(?!<\/article>)[\s\S])*?href="catmailco\.html"[\s\S]*?<\/article>/],
    ['index.html', /<a class="latest-game-card" href="catmailco\.html"[^>]*>[\s\S]*?<\/a>/]
  ]) {
    const card = read(file).match(pattern)?.[0];
    assert.ok(card);
    assert.match(card, /0\.3/);
    assert.match(card, /Patch #7/);
    assert.match(card, /datetime="2026-10-02">2\. 10\. 2026/);
  }
  assert.match(read('sitemap.xml'), /<loc>https:\/\/nioczloc\.com\/catmailco\.html<\/loc>\s*<lastmod>2026-10-08<\/lastmod>/);
  const steps = detail.match(/<ol class="steps install-steps">([\s\S]*?)<\/ol>/)[1];
  assert.equal([...steps.matchAll(/<li>/g)].length, 6);
  assert.match(steps, /install\.exe/);
  assert.match(steps, /Procházet \(Browse\)/);
  assert.match(detail, /SmartScreen/);
  assert.doesNotMatch(detail, /resources\.assets|patch 6|35\.7 MB/);
});

test('stale admin release metadata cannot downgrade a local release; saved builds stay authoritative', () => {
  const saved = { game_slug: 'catmailco', translation_version: '0.2', supported_game_version: 'patch 6', translation_updated_at: '2026-08-30', verified_build_id: '24865609', steam_app_id: '4380490' };
  const frontend = context.merge({ catmailco: game }, { catmailco: saved }).catmailco;
  const backend = applyAdminGameConfig({ games: { catmailco: game } }, [saved]).games.catmailco;
  for (const merged of [frontend, backend]) {
    assert.equal(merged.supportedVersion, 'Patch #7');
    assert.equal(merged.verifiedBuildId, '24865609');
    assert.equal(merged.verifiedBuildSource, 'database');
    assert.equal(merged.currentBuildId, '25651540');
  }
  assert.equal(frontend.translationVersion, '0.3');
  assert.equal(frontend.translationUpdatedAt, '2026-10-02');
  for (const date of ['2026-10-02', '2026-10-03']) {
    const newer = { ...saved, translation_updated_at: date, translation_version: '0.4', supported_game_version: 'Patch #8' };
    assert.equal(context.merge({ catmailco: game }, { catmailco: newer }).catmailco.translationVersion, '0.4');
    assert.equal(applyAdminGameConfig({ games: { catmailco: game } }, [newer]).games.catmailco.supportedVersion, 'Patch #8');
  }
});

test('Steam changes only Latest Build and preserves manually verified builds and admin blocking states', () => {
  const original = { ...game, verifiedBuildId: '24865609', verifiedBuildSource: 'database', statusOverride: { status: 'pending', verifiedBuildId: '24865609' } };
  const refreshed = applySteamSnapshot({ games: { catmailco: original } }, { games: { catmailco: { appId: '4380490', currentBuildId: '25651541', lastSteamUpdate: '2026-10-02T12:00:00Z' } } }).games.catmailco;
  assert.equal(refreshed.currentBuildId, '25651541');
  assert.equal(refreshed.verifiedBuildId, '24865609');
  assert.deepEqual(refreshed.statusOverride, original.statusOverride);
  assert.equal(resolveDisplayStatus(refreshed).key, 'pending');
  assert.equal(resolveDisplayStatus({ ...refreshed, statusOverride: { status: 'broken' } }).key, 'broken');
  assert.equal(resolveDisplayStatus(game).key, 'functional');
  assert.equal(resolveDisplayStatus({ ...game, currentBuildId: '25651541' }).key, 'pending');
});
