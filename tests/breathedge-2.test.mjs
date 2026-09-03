import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolveDisplayStatus } from "../netlify/functions/_lib/game-status.mjs";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
const detail = read("breathedge-2.html");
const index = read("index.html");
const translations = read("preklady.html");
const sitemap = read("sitemap.xml");
const script = read("script.js");
const status = JSON.parse(read("data/game-status.json"));
const migration = read("SQL EDITOR/SUPABASE-BREATHEDGE-2.sql");
const commentsMigration = read("SQL EDITOR/SUPABASE-COMMENTS-SLUGS.sql");
const ratingsMigration = read("SQL EDITOR/SUPABASE-GAME-RATINGS.sql");

test("Breathedge 2 is registered consistently across the site", () => {
  for (const html of [index, translations]) {
    assert.match(html, /href="breathedge-2\.html/);
    assert.match(html, /data-game-status="breathedge-2"/);
    assert.match(html, /assets\/Breathedge_2\/Breathedge_hl\.png/);
  }

  assert.match(sitemap, /https:\/\/nioczloc\.com\/breathedge-2\.html/);
  assert.match(script, /'breathedge-2': \{ name: 'Breathedge 2'/);

  const game = status.games["breathedge-2"];
  assert.equal(game.name, "Breathedge 2");
  assert.equal(game.appId, "2412960");
  assert.equal(game.supportedVersion, "v0.8.5");
  assert.equal(game.verifiedBuildId, "25077518");
  assert.equal(game.currentBuildId, "25077518");
  assert.equal(resolveDisplayStatus(game).key, "functional");
  assert.equal(resolveDisplayStatus({ ...game, currentBuildId: "25077519" }).key, "pending");
});

test("detail uses the requested SEO, content and shared feature hooks", () => {
  assert.match(detail, /<title>Breathedge 2 – čeština, český překlad \| Nio Localization<\/title>/);
  assert.match(detail, /content="Čeština a český překlad pro hru Breathedge 2 ke stažení\. Návod na instalaci a novinky o překladu\."/);
  assert.match(detail, /<h1>Breathedge 2 – Čeština<\/h1>/);
  assert.match(detail, /<body data-game="breathedge-2">/);
  assert.equal([...detail.matchAll(/data-game-status="breathedge-2"/g)].length, 2);
  assert.match(detail, /data-comments-list/);
  assert.match(detail, /data-download data-game="breathedge-2"/);
  assert.match(detail, /data-download-count/);
  assert.match(detail, /Breathedge_2_NioCZ_v0\.1\.zip/);
  assert.match(detail, /0\.44 MB/);
  assert.match(detail, /2\. 9\. 2026/);
  assert.match(detail, /Kontrola ve hře<\/span><b>75 %/);
  assert.match(detail, /Breathedge2_CZ_P\.pak/);
  assert.match(detail, /Breathedge2_CZ_P\.utoc/);
  assert.match(detail, /Breathedge2_CZ_P\.ucas/);
  assert.match(detail, /Breathedge2\\Content\\Paks/);
  assert.match(detail, /English \/ English \(US\)/);
  assert.match(detail, /Unreal Engine/);
  assert.match(script, /from\('game_ratings'\)/);
  assert.match(script, /bug-reports\.html\?game=\$\{encodeURIComponent\(gameSlug\)\}/);
});

test("all supplied images keep their exact names in the requested asset folder", () => {
  for (const name of ["Breathedge_hl.png", "Breathedge_1.png", "Breathedge_2.png", "Breathedge_3.png", "Breathedge_4.png", "Breathedge_5.png"]) {
    assert.ok(existsSync(new URL(`assets/Breathedge_2/${name}`, root)), `${name} must exist`);
  }

  assert.equal([...detail.matchAll(/assets\/Breathedge_2\/Breathedge_[1-5]\.png/g)].length, 10);
  assert.doesNotMatch(detail, /assets\/Breathedge_2\/Breathedge_hl\.png/);
});

test("Supabase migrations whitelist the slug for every persisted feature", () => {
  assert.match(migration, /alter table public\.comments/i);
  assert.match(migration, /alter table public\.bug_reports/i);
  assert.match(migration, /alter table public\.game_ratings/i);
  assert.match(migration, /alter table public\.download_totals/i);
  assert.match(migration, /values \('breathedge-2', 0\)/i);
  assert.match(migration, /create or replace function public\.register_download\(requested_game_slug text\)/i);
  assert.ok([...migration.matchAll(/'breathedge-2'/g)].length >= 5);
  assert.match(commentsMigration, /'breathedge-2'/);
  assert.ok([...ratingsMigration.matchAll(/'breathedge-2'/g)].length >= 2);
});
