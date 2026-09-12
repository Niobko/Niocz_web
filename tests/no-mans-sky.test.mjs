import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");

const detail = read("no-mans-sky.html");
const index = read("index.html");
const translations = read("preklady.html");
const sitemap = read("sitemap.xml");
const script = read("script.js");
const migration = read("SQL%20EDITOR/SUPABASE-NO-MANS-SKY.sql");
const status = JSON.parse(read("data/game-status.json"));

test("No Man's Sky is listed everywhere and uses the requested artwork", () => {
  assert.match(index, /href="no-mans-sky\.html"/);
  assert.match(translations, /href="no-mans-sky\.html"/);
  assert.match(sitemap, /no-mans-sky\.html/);
  for (const file of ["Sky_hl.jpg", "Sky_1.png", "Sky_2.png", "Sky_3.png", "Sky_4.png", "Sky_7.png"]) {
    assert.equal(existsSync(new URL(`assets/No%20Man%20Sky/${file}`, root)), true, `${file} is missing`);
    assert.match(detail, new RegExp(file.replace(".", "\\.")));
  }
});

test("No Man's Sky detail keeps all shared community and download hooks", () => {
  assert.match(detail, /<title>No Man's Sky – čeština, český překlad \| Nio Localization<\/title>/);
  assert.match(detail, /<h1>No Man's Sky – Čeština<\/h1>/);
  assert.equal([...detail.matchAll(/data-game-status="no-mans-sky"/g)].length, 2);
  assert.match(detail, /data-comments-list/);
  assert.match(detail, /data-download data-game="no-mans-sky"/);
  assert.match(detail, /data-download-count/);
  assert.match(script, /bug-reports\.html\?game=\$\{encodeURIComponent\(gameSlug\)\}/);
  assert.match(script, /className = 'game-rating-card'/);
  assert.match(detail, /Windows může při prvním spuštění zobrazit upozornění SmartScreen/);
});

test("No Man's Sky uses the verified live Steam public build", () => {
  const game = status.games["no-mans-sky"];
  assert.equal(game.appId, "275850");
  assert.equal(game.supportedVersion, "COSMOS (7.0)");
  assert.equal(game.verifiedBuildId, "25233815");
  assert.equal(game.currentBuildId, "25233815");
  assert.equal(game.lastSteamUpdate, "2026-09-10T15:03:20.000Z");
  assert.match(script, /'no-mans-sky'|"no-mans-sky"/);
});

test("No Man's Sky Supabase migration enables every community feature", () => {
  assert.match(migration, /alter table public\.comments/i);
  assert.match(migration, /alter table public\.bug_reports/i);
  assert.match(migration, /alter table public\.game_ratings/i);
  assert.match(migration, /alter table public\.download_totals/i);
  assert.match(migration, /values \('no-mans-sky', 0\)/i);
  assert.ok([...migration.matchAll(/'no-mans-sky'/g)].length >= 5);
});
