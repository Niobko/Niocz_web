import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolveDisplayStatus } from "../netlify/functions/_lib/game-status.mjs";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
const detail = read("the-spell-brigade.html");
const index = read("index.html");
const translations = read("preklady.html");
const sitemap = read("sitemap.xml");
const script = read("script.js");
const status = JSON.parse(read("data/game-status.json"));
const migration = read("SQL EDITOR/SUPABASE-THE-SPELL-BRIGADE.sql");
const commentsMigration = read("SQL EDITOR/SUPABASE-COMMENTS-SLUGS.sql");
const ratingsMigration = read("SQL EDITOR/SUPABASE-GAME-RATINGS.sql");

test("The Spell Brigade is registered consistently across the site", () => {
  for (const html of [index, translations]) {
    assert.match(html, /href="the-spell-brigade\.html/);
    assert.match(html, /data-game-status="the-spell-brigade"/);
    assert.match(html, /assets\/The Spell Brigade\/TheSpell_hl\.png/);
  }

  assert.match(sitemap, /https:\/\/nioczloc\.com\/the-spell-brigade\.html/);
  assert.match(script, /'the-spell-brigade': \{ name: 'The Spell Brigade'/);

  const game = status.games["the-spell-brigade"];
  assert.equal(game.name, "The Spell Brigade");
  assert.equal(game.appId, "2904000");
  assert.equal(game.supportedVersion, "v1.1.2.19558");
  assert.equal(game.verifiedBuildId, "24087913");
  assert.equal(game.currentBuildId, "24087913");
  assert.equal(resolveDisplayStatus(game).key, "functional");
  assert.equal(resolveDisplayStatus({ ...game, currentBuildId: "24087914" }).key, "pending");
});

test("detail uses the requested SEO, content and shared feature hooks", () => {
  assert.match(detail, /<title>The Spell Brigade – čeština, český překlad \| Nio Localization<\/title>/);
  assert.match(detail, /content="Čeština a český překlad pro hru The Spell Brigade ke stažení\. Návod na instalaci a novinky o překladu\."/);
  assert.match(detail, /<h1>The Spell Brigade – Čeština<\/h1>/);
  assert.match(detail, /<body data-game="the-spell-brigade">/);
  assert.equal([...detail.matchAll(/data-game-status="the-spell-brigade"/g)].length, 2);
  assert.match(detail, /data-comments-list/);
  assert.match(detail, /data-download data-game="the-spell-brigade"/);
  assert.match(detail, /data-download-count/);
  assert.match(detail, /The\.Spell\.Brigade_NioCZ_v0\.2\.zip/);
  assert.match(detail, /0\.72 MB/);
  assert.match(detail, /30\. 8\. 2026/);
  assert.match(detail, /Kontrola ve hře<\/span><b>80 %/);
  assert.match(detail, /TheSpellBrigade_Data/);
  assert.match(detail, /Nahradit soubory v cíli/);
  assert.match(detail, /Ověřit integritu herních souborů/);
  assert.match(detail, /Unity/);
  assert.doesNotMatch(detail, /Unit Engine/);
});

test("all supplied images keep their exact names in the requested asset folder", () => {
  for (const name of ["TheSpell_hl.png", "TheSpell_1.png", "TheSpell_2.png", "TheSpell_3.png", "TheSpell_4.png", "TheSpell_5.png"]) {
    assert.ok(existsSync(new URL(`assets/The Spell Brigade/${name}`, root)), `${name} must exist`);
  }

  assert.equal([...detail.matchAll(/assets\/The Spell Brigade\/TheSpell_[1-5]\.png/g)].length, 10);
  assert.doesNotMatch(detail, /assets\/The Spell Brigade\/TheSpell_hl\.png/);
});

test("Supabase migrations whitelist the slug for every persisted feature", () => {
  assert.match(migration, /alter table public\.comments/i);
  assert.match(migration, /alter table public\.bug_reports/i);
  assert.match(migration, /alter table public\.game_ratings/i);
  assert.match(migration, /alter table public\.download_totals/i);
  assert.match(migration, /values \('the-spell-brigade', 0\)/i);
  assert.match(migration, /create or replace function public\.register_download\(requested_game_slug text\)/i);
  assert.ok([...migration.matchAll(/'the-spell-brigade'/g)].length >= 5);
  assert.match(commentsMigration, /'the-spell-brigade'/);
  assert.ok([...ratingsMigration.matchAll(/'the-spell-brigade'/g)].length >= 2);
});
