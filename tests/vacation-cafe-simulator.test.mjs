import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolveDisplayStatus } from "../netlify/functions/_lib/game-status.mjs";

const root = new URL("../", import.meta.url);
const read = file => readFileSync(new URL(file, root), "utf8");
const detail = read("vacation-cafe-simulator.html");
const translations = read("preklady.html");
const index = read("index.html");
const sitemap = read("sitemap.xml");
const script = read("script.js");
const styles = read("style.css");
const status = JSON.parse(read("data/game-status.json"));
const migration = read("SQL EDITOR/SUPABASE-VACATION-CAFE-SIMULATOR.sql");
const commentsMigration = read("SQL EDITOR/SUPABASE-COMMENTS-SLUGS.sql");
const ratingsMigration = read("SQL EDITOR/SUPABASE-GAME-RATINGS.sql");

test("Vacation Cafe Simulator is registered consistently across the site", () => {
  for (const html of [index, translations]) {
    assert.match(html, /href="vacation-cafe-simulator\.html/);
    assert.match(html, /data-game-status="vacation-cafe-simulator"/);
    assert.match(html, /assets\/Vacation_Cafe_Simulator\/Vaca_hl\.jpg/);
  }

  assert.match(sitemap, /https:\/\/nioczloc\.com\/vacation-cafe-simulator\.html/);
  assert.match(script, /'vacation-cafe-simulator': \{ name: 'Vacation Cafe Simulator'/);

  const game = status.games["vacation-cafe-simulator"];
  assert.equal(game.name, "Vacation Cafe Simulator");
  assert.equal(game.appId, "3196440");
  assert.equal(game.supportedVersion, "v1.0.3");
  assert.equal(game.verifiedBuildId, "24974484");
  assert.equal(game.currentBuildId, "24974484");
  assert.equal(resolveDisplayStatus(game).key, "functional");
});

test("Vacation Cafe Simulator detail includes the supplied content and all shared hooks", () => {
  assert.match(detail, /<title>Vacation Cafe Simulator – čeština, český překlad \| Nio Localization<\/title>/);
  assert.match(detail, /content="Čeština a český překlad pro hru Vacation Cafe Simulator ke stažení\. Návod na instalaci a novinky o překladu\."/);
  assert.match(detail, /<h1>Vacation Cafe Simulator – Čeština<\/h1>/);
  assert.match(detail, /<body data-game="vacation-cafe-simulator">/);
  assert.equal([...detail.matchAll(/data-game-status="vacation-cafe-simulator"/g)].length, 2);
  assert.match(detail, /data-comments-list/);
  assert.match(detail, /data-download data-game="vacation-cafe-simulator"/);
  assert.match(detail, /data-download-count/);
  assert.match(detail, /Vacation\.Cafe\.Simulator_NioCZ_v0\.1\.zip/);
  assert.match(detail, /0\.19 MB/);
  assert.match(detail, /VacationCafe_Data/);
  assert.match(detail, /Ověřit integritu herních souborů/);
});

test("all supplied Vacation Cafe Simulator images are wired to their intended roles", () => {
  const names = ["Vaca_hl.jpg", "Vaca_1.png", "Vaca_2.png", "Vaca_3.png", "Vaca_4.png", "Vaca_5.png"];
  for (const name of names) {
    assert.ok(existsSync(new URL(`assets/Vacation_Cafe_Simulator/${name}`, root)), `${name} must exist`);
  }

  assert.equal([...detail.matchAll(/assets\/Vacation_Cafe_Simulator\/Vaca_[1-5]\.png/g)].length, 10);
  assert.doesNotMatch(detail, /assets\/Vacation_Cafe_Simulator\/Vaca_hl\.jpg/);
});

test("Vacation Cafe Simulator database migration enables every community feature", () => {
  assert.match(migration, /alter table public\.comments/i);
  assert.match(migration, /alter table public\.bug_reports/i);
  assert.match(migration, /alter table public\.game_ratings/i);
  assert.match(migration, /alter table public\.download_totals/i);
  assert.match(migration, /values \('vacation-cafe-simulator', 0\)/i);
  assert.match(migration, /create or replace function public\.register_download\(requested_game_slug text\)/i);
  assert.ok([...migration.matchAll(/'vacation-cafe-simulator'/g)].length >= 5);
  assert.match(commentsMigration, /'vacation-cafe-simulator'/);
  assert.ok([...ratingsMigration.matchAll(/'vacation-cafe-simulator'/g)].length >= 2);
});

test("mobile listings keep the new cards visible without waiting for reveal observation", () => {
  assert.match(styles, /\.translations-page \.reveal\{opacity:1;transform:none;transition:none\}/);
  assert.match(styles, /\.news-section \.latest-games\.reveal\{opacity:1;transform:none;transition:none\}/);
});
