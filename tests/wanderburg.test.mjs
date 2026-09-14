import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolveDisplayStatus } from "../netlify/functions/_lib/game-status.mjs";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
const detail = read("wanderburg.html");
const translations = read("preklady.html");
const news = read("index.html");
const sitemap = read("sitemap.xml");
const script = read("script.js");
const userSystem = read("user-system.js");
const status = JSON.parse(read("data/game-status.json"));
const sql = read("SQL%20EDITOR/SUPABASE-WANDERBURG.sql");

test("Wanderburg is published consistently across the site", () => {
  for (const html of [news, translations]) {
    assert.match(html, /href="wanderburg\.html/);
    assert.match(html, /data-game-status="wanderburg"/);
    assert.match(html, /assets\/Wanderburg\/Wander_hl\.jpg/);
    assert.match(html, /datetime="2026-09-14">14\. 9\. 2026/);
  }
  assert.match(sitemap, /wanderburg\.html<\/loc><lastmod>2026-09-14<\/lastmod>/);
  assert.match(script, /wanderburg: \{ name: 'Wanderburg'/);
  assert.match(userSystem, /wanderburg: \{ name: 'Wanderburg', page: 'wanderburg\.html'/);
});

test("Wanderburg detail contains release data, SEO and all shared hooks", () => {
  assert.match(detail, /<title>Wanderburg – čeština, český překlad \| Nio Localization<\/title>/);
  assert.match(detail, /Wanderburg čeština a český překlad ke stažení/);
  assert.match(detail, /<h1>Wanderburg – Čeština<\/h1>/);
  assert.match(detail, /rel="canonical" href="https:\/\/nioczloc\.com\/wanderburg\.html"/);
  assert.match(detail, /property="og:title"/);
  assert.match(detail, /name="twitter:card" content="summary_large_image"/);
  assert.match(detail, /<body data-game="wanderburg">/);
  assert.equal([...detail.matchAll(/data-game-status="wanderburg"/g)].length, 2);
  assert.match(detail, /data-comments-list/);
  assert.match(detail, /data-download data-game="wanderburg"/);
  assert.match(detail, /data-download-count/);
  assert.match(detail, /Wanderburg_NioCZ\.zip/);
  assert.match(detail, /0\.17 MB/);
  assert.match(detail, /Kontrola ve hře<\/span><b>75 %/);
  assert.match(detail, /SmartScreen/);
  assert.match(detail, /Procházet \(Browse\)/);
  assert.match(detail, /Ověřit integritu herních souborů/);
});

test("all supplied Wanderburg images are preserved and linked", () => {
  for (const file of ["Wander_hl.jpg", "Wander_1.png", "Wander_2.png", "Wander_3.png", "Wander_4.png", "Wander_5.png"]) {
    assert.ok(existsSync(new URL(`assets/Wanderburg/${file}`, root)), `${file} is missing`);
  }
  assert.equal([...detail.matchAll(/assets\/Wanderburg\/Wander_[1-5]\.png/g)].length, 10);
  assert.equal([...detail.matchAll(/assets\/Wanderburg\/Wander_hl\.jpg/g)].length, 4);
});

test("Wanderburg Steam status uses the verified public build", () => {
  const game = status.games.wanderburg;
  assert.equal(game.appId, "3624140");
  assert.equal(game.supportedVersion, "0.9.11");
  assert.equal(game.verifiedBuildId, "25275561");
  assert.equal(game.currentBuildId, "25275561");
  assert.equal(game.lastSteamUpdate, "2026-09-12T20:59:49Z");
  assert.equal(resolveDisplayStatus(game).key, "functional");
  assert.equal(resolveDisplayStatus({ ...game, currentBuildId: "25275562" }).key, "pending");
  assert.match(detail, /store\.steampowered\.com\/app\/3624140/);
});

test("Wanderburg Supabase migration enables every persisted feature", () => {
  assert.match(sql, /values \('wanderburg', 'Wanderburg', 'v0\.1', '0\.9\.11', date '2026-09-14'\)/);
  assert.match(sql, /steam_app_id = '3624140'/);
  assert.match(sql, /verified_build_id = '25275561'/);
  for (const table of ["comments", "bug_reports", "game_ratings", "download_totals"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table}`));
  }
  assert.match(sql, /values \('wanderburg', 0\)/);
  assert.ok([...sql.matchAll(/'wanderburg'/g)].length >= 8);
});
