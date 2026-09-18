import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolveDisplayStatus } from "../netlify/functions/_lib/game-status.mjs";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
const detail = read("tcg-card-shop-simulator.html");
const translations = read("preklady.html");
const news = read("index.html");
const sitemap = read("sitemap.xml");
const script = read("script.js");
const userSystem = read("user-system.js");
const commentsSql = read("SQL%20EDITOR/SUPABASE-COMMENTS-SLUGS.sql");
const ratingsSql = read("SQL%20EDITOR/SUPABASE-GAME-RATINGS.sql");
const migration = read("SQL%20EDITOR/SUPABASE-TCG-CARD-SHOP-SIMULATOR.sql");
const status = JSON.parse(read("data/game-status.json"));

test("TCG Card Shop Simulator is registered across the public site", () => {
  for (const html of [news, translations]) {
    assert.match(html, /href="tcg-card-shop-simulator\.html/);
    assert.match(html, /data-game-status="tcg-card-shop-simulator"/);
    assert.match(html, /assets\/TCG%20Card%20Shop%20Simulator\/TCG_hl\.jpg/);
    assert.match(html, /datetime="2026-09-18">18\. 9\. 2026/);
  }
  assert.match(sitemap, /tcg-card-shop-simulator\.html<\/loc><lastmod>2026-09-18<\/lastmod>/);
  assert.match(script, /'tcg-card-shop-simulator': \{ name: 'TCG Card Shop Simulator'/);
  assert.match(userSystem, /'tcg-card-shop-simulator': \{ name: 'TCG Card Shop Simulator', page: 'tcg-card-shop-simulator\.html'/);
});

test("TCG detail keeps SEO, supplied content and every shared hook", () => {
  assert.match(detail, /<title>TCG Card Shop Simulator – čeština, český překlad \| Nio Localization<\/title>/);
  assert.match(detail, /TCG Card Shop Simulator čeština a český překlad/);
  assert.match(detail, /<h1>TCG Card Shop Simulator – Čeština<\/h1>/);
  assert.match(detail, /rel="canonical" href="https:\/\/nioczloc\.com\/tcg-card-shop-simulator\.html"/);
  assert.match(detail, /<body data-game="tcg-card-shop-simulator">/);
  assert.equal([...detail.matchAll(/data-game-status="tcg-card-shop-simulator"/g)].length, 2);
  assert.match(detail, /data-comments-list/);
  assert.match(detail, /data-download data-game="tcg-card-shop-simulator"/);
  assert.match(detail, /data-download-count/);
  assert.match(detail, /TCG\.Card\.Shop\.Simulator_NioCZ\.zip/);
  assert.match(detail, /1\.05 MB/);
  assert.match(detail, /Kontrola ve hře<\/span><b>85 %/);
  assert.match(detail, /SmartScreen/);
  assert.match(detail, /Procházet \(Browse\)/);
  assert.match(detail, /Ověřit integritu herních souborů/);
  assert.doesNotMatch(detail, /Wanderburg/);
  assert.doesNotMatch(detail, /Chceš k tomuto popisu/);
});

test("all six supplied TCG images are present and linked", () => {
  for (const file of ["TCG_hl.jpg", "TCG_1.png", "TCG_2.png", "TCG_3.png", "TCG_4.png", "TCG_5.png"]) {
    assert.ok(existsSync(new URL(`assets/TCG Card Shop Simulator/${file}`, root)), `${file} is missing`);
  }
  assert.equal([...detail.matchAll(/TCG_[1-5]\.png/g)].length, 10);
  assert.equal([...detail.matchAll(/TCG_hl\.jpg/g)].length, 4);
});

test("Steam status uses the verified v1.02 public build", () => {
  const game = status.games["tcg-card-shop-simulator"];
  assert.equal(game.appId, "3070070");
  assert.equal(game.supportedVersion, "v1.02");
  assert.equal(game.verifiedBuildId, "25381942");
  assert.equal(game.currentBuildId, "25381942");
  assert.equal(game.lastSteamUpdate, "2026-09-18T02:46:08Z");
  assert.equal(resolveDisplayStatus(game).key, "functional");
  assert.equal(resolveDisplayStatus({ ...game, currentBuildId: "25381943" }).key, "pending");
  assert.match(detail, /store\.steampowered\.com\/app\/3070070/);
});

test("Supabase SQL enables every persisted feature", () => {
  assert.match(commentsSql, /'tcg-card-shop-simulator'/);
  assert.ok([...ratingsSql.matchAll(/'tcg-card-shop-simulator'/g)].length >= 2);
  assert.match(migration, /values \('tcg-card-shop-simulator', 'TCG Card Shop Simulator', 'v1\.0', 'v1\.02', date '2026-09-18'\)/);
  assert.match(migration, /steam_app_id = '3070070'/);
  assert.match(migration, /verified_build_id = '25381942'/);
  for (const table of ["comments", "bug_reports", "game_ratings", "download_totals"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table}`));
  }
  assert.match(migration, /values \('tcg-card-shop-simulator', 0\)/);
  assert.match(migration, /user_followed_games a user_favorite_games/);
});
