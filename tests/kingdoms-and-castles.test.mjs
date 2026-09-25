import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolveDisplayStatus } from "../netlify/functions/_lib/game-status.mjs";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
const detail = read("kingdoms-and-castles.html");
const translations = read("preklady.html");
const news = read("index.html");
const sitemap = read("sitemap.xml");
const script = read("script.js");
const userSystem = read("user-system.js");
const commentsSql = read("SQL%20EDITOR/SUPABASE-COMMENTS-SLUGS.sql");
const ratingsSql = read("SQL%20EDITOR/SUPABASE-GAME-RATINGS.sql");
const migration = read("SQL%20EDITOR/SUPABASE-KINGDOMS-AND-CASTLES.sql");
const status = JSON.parse(read("data/game-status.json"));

test("Kingdoms and Castles is registered across the public site", () => {
  for (const html of [news, translations]) {
    assert.match(html, /href="kingdoms-and-castles\.html/);
    assert.match(html, /data-game-status="kingdoms-and-castles"/);
    assert.match(html, /assets\/Kingdoms%20and%20Castles\/KingCastles_hl\.jpg/);
    assert.match(html, /datetime="2026-09-25">25\. 9\. 2026/);
  }
  assert.match(sitemap, /kingdoms-and-castles\.html<\/loc><lastmod>2026-09-25<\/lastmod>/);
  assert.match(script, /'kingdoms-and-castles': \{ name: 'Kingdoms and Castles'/);
  assert.match(userSystem, /'kingdoms-and-castles': \{ name: 'Kingdoms and Castles', page: 'kingdoms-and-castles\.html'/);
});

test("Kingdoms and Castles detail keeps SEO, content and every shared hook", () => {
  assert.match(detail, /<title>Kingdoms and Castles – čeština, český překlad \| Nio Localization<\/title>/);
  assert.match(detail, /Kingdoms and Castles čeština a český překlad/);
  assert.match(detail, /<h1>Kingdoms and Castles – Čeština<\/h1>/);
  assert.match(detail, /rel="canonical" href="https:\/\/nioczloc\.com\/kingdoms-and-castles\.html"/);
  assert.match(detail, /<body data-game="kingdoms-and-castles">/);
  assert.equal([...detail.matchAll(/data-game-status="kingdoms-and-castles"/g)].length, 2);
  assert.match(detail, /data-comments-list/);
  assert.match(detail, /data-download data-game="kingdoms-and-castles"/);
  assert.match(detail, /data-download-count/);
  assert.match(detail, /Kingdoms\.and\.Castles_NioCZ\.zip/);
  assert.match(detail, /0\.14 MB/);
  assert.match(detail, /Kontrola ve hře<\/span><b>75 %/);
  assert.match(detail, /SmartScreen/);
  assert.match(detail, /Procházet \(Browse\)/);
  assert.match(detail, /Ověřit integritu herních souborů/);
});

test("all six supplied Kingdoms and Castles images are present and linked", () => {
  for (const file of ["KingCastles_hl.jpg", "KingCastles_1.png", "KingCastles_2.png", "KingCastles_3.png", "KingCastles_4.png", "KingCastles_5.png"]) {
    assert.ok(existsSync(new URL(`assets/Kingdoms and Castles/${file}`, root)), `${file} is missing`);
  }
  assert.equal([...detail.matchAll(/KingCastles_[1-5]\.png/g)].length, 10);
  assert.equal([...detail.matchAll(/KingCastles_hl\.jpg/g)].length, 4);
});

test("Steam status uses the verified 123r6 public build", () => {
  const game = status.games["kingdoms-and-castles"];
  assert.equal(game.appId, "569480");
  assert.equal(game.supportedVersion, "123r6s");
  assert.equal(game.verifiedBuildId, "18567986");
  assert.equal(game.currentBuildId, "18567986");
  assert.equal(game.lastSteamUpdate, "2025-05-22T15:18:07.000Z");
  assert.equal(resolveDisplayStatus(game).key, "functional");
  assert.equal(resolveDisplayStatus({ ...game, currentBuildId: "18567987" }).key, "pending");
  assert.match(detail, /store\.steampowered\.com\/app\/569480/);
});

test("Supabase SQL enables every persisted feature", () => {
  assert.match(commentsSql, /'kingdoms-and-castles'/);
  assert.ok([...ratingsSql.matchAll(/'kingdoms-and-castles'/g)].length >= 2);
  assert.match(migration, /values \('kingdoms-and-castles', 'Kingdoms and Castles', 'v1\.0', '123r6s', date '2026-09-25'\)/);
  assert.match(migration, /steam_app_id = '569480'/);
  assert.match(migration, /verified_build_id = '18567986'/);
  for (const table of ["comments", "bug_reports", "game_ratings", "download_totals"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table}`));
  }
  assert.match(migration, /values \('kingdoms-and-castles', 0\)/);
  assert.match(migration, /user_followed_games a user_favorite_games/);
});
