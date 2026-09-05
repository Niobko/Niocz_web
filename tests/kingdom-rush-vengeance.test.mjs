import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolveDisplayStatus } from "../netlify/functions/_lib/game-status.mjs";

const root = new URL("../", import.meta.url);
const read = file => readFileSync(new URL(file, root), "utf8");
const detail = read("kingdom-rush-vengeance.html");
const translations = read("preklady.html");
const index = read("index.html");
const sitemap = read("sitemap.xml");
const script = read("script.js");
const status = JSON.parse(read("data/game-status.json"));
const migration = read("SQL EDITOR/SUPABASE-KINGDOM-RUSH-VENGEANCE.sql");
const commentsMigration = read("SQL EDITOR/SUPABASE-COMMENTS-SLUGS.sql");
const ratingsMigration = read("SQL EDITOR/SUPABASE-GAME-RATINGS.sql");

test("Kingdom Rush Vengeance is registered consistently across the site", () => {
  for (const html of [index, translations]) {
    assert.match(html, /href="kingdom-rush-vengeance\.html/);
    assert.match(html, /data-game-status="kingdom-rush-vengeance"/);
    assert.match(html, /assets\/Kingdom Rush Vengeance\/Kings_hl\.jpg/);
  }

  assert.match(index, /25 překladů/);
  assert.match(sitemap, /https:\/\/nioczloc\.com\/kingdom-rush-vengeance\.html/);
  assert.match(script, /'kingdom-rush-vengeance': \{ name: 'Kingdom Rush Vengeance'/);

  const game = status.games["kingdom-rush-vengeance"];
  assert.equal(game.name, "Kingdom Rush Vengeance");
  assert.equal(game.appId, "1367550");
  assert.equal(game.supportedVersion, "v1.16.4.0");
  assert.equal(game.verifiedBuildId, "22944017");
  assert.equal(game.currentBuildId, "22944017");
  assert.equal(game.lastSteamUpdate, "2026-04-24T16:09:16Z");
  assert.equal(resolveDisplayStatus(game).key, "functional");
  assert.equal(resolveDisplayStatus({ ...game, currentBuildId: "22944018" }).key, "pending");
});

test("Kingdom Rush Vengeance detail includes the supplied content and all shared hooks", () => {
  assert.match(detail, /<title>Kingdom Rush Vengeance – čeština, český překlad \| Nio Localization<\/title>/);
  assert.match(detail, /content="Čeština a český překlad pro hru Kingdom Rush Vengeance ke stažení\. Návod na instalaci a novinky o překladu\."/);
  assert.match(detail, /<h1>Kingdom Rush Vengeance – Čeština<\/h1>/);
  assert.match(detail, /<body data-game="kingdom-rush-vengeance">/);
  assert.equal([...detail.matchAll(/data-game-status="kingdom-rush-vengeance"/g)].length, 2);
  assert.match(detail, /data-comments-list/);
  assert.match(detail, /data-download data-game="kingdom-rush-vengeance"/);
  assert.match(detail, /data-download-count/);
  assert.match(detail, /Kingdom\.Rush\.Vengeance_NioCZ_v0\.1\.zip/);
  assert.match(detail, /13\.5 MB/);
  assert.match(detail, /4\. 9\. 2026/);
  assert.match(detail, /Kontrola ve hře<\/span><b>100 %/);
  assert.match(detail, /KR4_PC/);
  assert.match(detail, /Kingdom Rush Vengeance\\fonts/);
  assert.match(detail, /Čeština se načte automaticky/);
  assert.match(detail, /Localized_en/);
  assert.match(detail, /ověřte integritu souborů hry přes Steam/);
  assert.match(detail, /Cocos2d-x \/ C\+\+/);
});

test("all supplied Kingdom Rush Vengeance images are wired to their intended roles", () => {
  const names = ["Kings_hl.jpg", "Kings_1.png", "Kings_2.png", "Kings_3.png", "Kings_4.png", "Kings_5.png"];
  for (const name of names) {
    assert.ok(existsSync(new URL(`assets/Kingdom Rush Vengeance/${name}`, root)), `${name} must exist`);
  }

  assert.equal([...detail.matchAll(/assets\/Kingdom Rush Vengeance\/Kings_[1-5]\.png/g)].length, 10);
  assert.doesNotMatch(detail, /assets\/Kingdom Rush Vengeance\/Kings_hl\.jpg/);
});

test("Kingdom Rush Vengeance database migration enables every community feature", () => {
  assert.match(migration, /alter table public\.comments/i);
  assert.match(migration, /alter table public\.bug_reports/i);
  assert.match(migration, /alter table public\.game_ratings/i);
  assert.match(migration, /alter table public\.download_totals/i);
  assert.match(migration, /values \('kingdom-rush-vengeance', 0\)/i);
  assert.match(migration, /create or replace function public\.register_download\(requested_game_slug text\)/i);
  assert.ok([...migration.matchAll(/'kingdom-rush-vengeance'/g)].length >= 5);
  assert.match(commentsMigration, /'kingdom-rush-vengeance'/);
  assert.ok([...ratingsMigration.matchAll(/'kingdom-rush-vengeance'/g)].length >= 2);
});
