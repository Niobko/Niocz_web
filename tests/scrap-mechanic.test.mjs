import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolveDisplayStatus } from "../netlify/functions/_lib/game-status.mjs";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
const detail = read("scrap-mechanic.html");
const index = read("index.html");
const translations = read("preklady.html");
const sitemap = read("sitemap.xml");
const script = read("script.js");
const status = JSON.parse(read("data/game-status.json"));
const migration = read("SQL%20EDITOR/SUPABASE-SCRAP-MECHANIC.sql");
const commentsMigration = read("SQL%20EDITOR/SUPABASE-COMMENTS-SLUGS.sql");
const ratingsMigration = read("SQL%20EDITOR/SUPABASE-GAME-RATINGS.sql");

test("Scrap Mechanic is registered consistently across the site", () => {
  for (const html of [index, translations]) {
    assert.match(html, /href="scrap-mechanic\.html/);
    assert.match(html, /data-game-status="scrap-mechanic"/);
    assert.match(html, /assets\/Scrap%20Mechanic\/Scrap_hl\.jpg/);
  }
  assert.match(sitemap, /https:\/\/nioczloc\.com\/scrap-mechanic\.html/);
  assert.match(script, /'scrap-mechanic': \{ name: 'Scrap Mechanic'/);
  assert.match(index, /31 hotových češtin/);
  assert.match(index, /31 překladů/);
});

test("detail uses requested content and every shared feature hook", () => {
  assert.match(detail, /<title>Scrap Mechanic – čeština, český překlad \| Nio Localization<\/title>/);
  assert.match(detail, /content="Čeština a český překlad pro hru Scrap Mechanic ke stažení\. Návod na instalaci a novinky o překladu\."/);
  assert.match(detail, /<h1>Scrap Mechanic – Čeština<\/h1>/);
  assert.match(detail, /<body data-game="scrap-mechanic">/);
  assert.equal([...detail.matchAll(/data-game-status="scrap-mechanic"/g)].length, 2);
  assert.match(detail, /data-comments-list/);
  assert.match(detail, /data-download data-game="scrap-mechanic"/);
  assert.match(detail, /data-download-count/);
  assert.match(detail, /Scrap\.Mechanic_NioCZ\.zip/);
  assert.match(detail, /0\.24 MB/);
  assert.match(detail, /Kontrola ve hře<\/span><b>80 %/);
  assert.match(detail, /INSTALOVAT ČEŠTINU/);
  assert.match(detail, /Cache\\Bundle\\core_data\.cbo/);
  assert.match(detail, /Není potřeba ručně mazat celý priečinok Cache\./);
});

test("all supplied images have the intended hero and gallery roles", () => {
  for (const file of ["Scrap_hl.jpg", "Scrap_1.png", "Scrap_2.png", "Scrap_3.png", "Scrap_4.png", "Scrap_5.png"]) {
    assert.ok(existsSync(new URL(`assets/Scrap%20Mechanic/${file}`, root)), `${file} is missing`);
  }
  assert.equal([...detail.matchAll(/assets\/Scrap%20Mechanic\/Scrap_[1-5]\.png/g)].length, 10);
  assert.equal([...detail.matchAll(/assets\/Scrap%20Mechanic\/Scrap_hl\.jpg/g)].length, 2);
});

test("Steam status is configured as the verified functional build", () => {
  const game = status.games["scrap-mechanic"];
  assert.equal(game.appId, "387990");
  assert.equal(game.supportedVersion, "v1.0.5");
  assert.equal(game.verifiedBuildId, "25229539");
  assert.equal(game.currentBuildId, "25229539");
  assert.equal(resolveDisplayStatus(game).key, "functional");
});

test("Supabase migrations enable all persisted features", () => {
  assert.match(migration, /alter table public\.comments/i);
  assert.match(migration, /alter table public\.bug_reports/i);
  assert.match(migration, /alter table public\.game_ratings/i);
  assert.match(migration, /alter table public\.download_totals/i);
  assert.match(migration, /values \('scrap-mechanic', 0\)/i);
  assert.ok([...migration.matchAll(/'scrap-mechanic'/g)].length >= 5);
  assert.match(commentsMigration, /'scrap-mechanic'/);
  assert.ok([...ratingsMigration.matchAll(/'scrap-mechanic'/g)].length >= 2);
});
