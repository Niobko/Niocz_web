import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolveDisplayStatus } from "../netlify/functions/_lib/game-status.mjs";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
const detail = read("bombanana.html");
const index = read("index.html");
const translations = read("preklady.html");
const sitemap = read("sitemap.xml");
const script = read("script.js");
const styles = read("style.css");
const status = JSON.parse(read("data/game-status.json"));
const migration = read("SUPABASE-BOMBANANA.sql");
const commentsMigration = read("SQL EDITOR/SUPABASE-COMMENTS-SLUGS.sql");
const ratingsMigration = read("SQL EDITOR/SUPABASE-GAME-RATINGS.sql");

test("BOMBANANA is registered consistently across the site", () => {
  for (const html of [index, translations]) {
    assert.match(html, /href="bombanana\.html/);
    assert.match(html, /data-game-status="bombanana"/);
    assert.match(html, /assets\/BOMBANANA\/Banan_hl\.jpg/);
  }

  assert.match(sitemap, /https:\/\/nioczloc\.com\/bombanana\.html/);
  assert.match(script, /bombanana: \{ name: 'BOMBANANA'/);

  const game = status.games.bombanana;
  assert.equal(game.name, "BOMBANANA");
  assert.equal(game.appId, "4656000");
  assert.equal(game.supportedVersion, "v1.0.1");
  assert.equal(game.verifiedBuildId, "25068266");
  assert.equal(game.currentBuildId, "25068266");
  assert.equal(resolveDisplayStatus(game).key, "functional");
  assert.equal(resolveDisplayStatus({ ...game, currentBuildId: "25068267" }).key, "pending");
});

test("detail uses the requested SEO, Czech content and shared feature hooks", () => {
  assert.match(detail, /<title>BOMBANANA – čeština, český překlad \| Nio Localization<\/title>/);
  assert.match(detail, /content="Čeština a český překlad pro hru BOMBANANA ke stažení\. Návod na instalaci a novinky o překladu\."/);
  assert.match(detail, /<h1>BOMBANANA – Čeština<\/h1>/);
  assert.match(detail, /<body data-game="bombanana">/);
  assert.equal([...detail.matchAll(/data-game-status="bombanana"/g)].length, 2);
  assert.match(detail, /data-comments-list/);
  assert.match(detail, /data-download data-game="bombanana"/);
  assert.match(detail, /data-download-count/);
  assert.match(detail, /BOMBANANA_NioCZ_v0\.2\.zip/);
  assert.match(detail, /0\.28 MB/);
  assert.match(detail, /3\. 9\. 2026/);
  assert.match(detail, /Kontrola ve hře<\/span><b>100 %/);
  assert.match(detail, /BOMBANANA_Data\\StreamingAssets\\aa/);
  assert.match(detail, /jazykovou pozici <b>Polish<\/b>/);
  assert.match(detail, /Důležité: nastavte jazyk Polish/);
  assert.match(detail, /Ověřit integritu herních souborů/);
  assert.match(detail, /Steam obnoví původní soubory a čeština bude odstraněna/);
  assert.match(script, /from\('game_ratings'\)/);
  assert.match(script, /bug-reports\.html\?game=\$\{encodeURIComponent\(gameSlug\)\}/);
});

test("all supplied images keep their exact names in the requested asset folder", () => {
  for (const name of ["Banan_hl.jpg", "Banan_1.png", "Banan_2.png", "Banan_3.png", "Banan_4.png", "Banan_5.png"]) {
    assert.ok(existsSync(new URL(`assets/BOMBANANA/${name}`, root)), `${name} must exist`);
  }

  assert.equal([...detail.matchAll(/assets\/BOMBANANA\/Banan_[1-5]\.png/g)].length, 10);
  assert.doesNotMatch(detail, /assets\/BOMBANANA\/Banan_hl\.jpg/);
});

test("Supabase migrations whitelist the slug for every persisted feature", () => {
  assert.match(migration, /alter table public\.comments/i);
  assert.match(migration, /alter table public\.bug_reports/i);
  assert.match(migration, /alter table public\.game_ratings/i);
  assert.match(migration, /alter table public\.download_totals/i);
  assert.match(migration, /values \('bombanana', 0\)/i);
  assert.match(migration, /create or replace function public\.register_download\(requested_game_slug text\)/i);
  assert.ok([...migration.matchAll(/'bombanana'/g)].length >= 5);
  assert.match(commentsMigration, /'bombanana'/);
  assert.ok([...ratingsMigration.matchAll(/'bombanana'/g)].length >= 2);
});

test("mobile listings do not depend on reveal intersection timing", () => {
  assert.match(styles, /\.news-section \.latest-games\.reveal\{opacity:1;transform:none;transition:none\}/);
  assert.match(styles, /\.translations-page \.reveal\{opacity:1;transform:none;transition:none\}/);
});
