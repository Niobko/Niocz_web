import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveDisplayStatus } from "../netlify/functions/_lib/game-status.mjs";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
const detail = read("bookshop-simulator.html");
const translations = read("preklady.html");
const news = read("index.html");
const sitemap = read("sitemap.xml");
const status = JSON.parse(read("data/game-status.json"));
const sql = read("SQL EDITOR/SUPABASE-BOOKSHOP-SIMULATOR-UPDATE.sql");

test("Bookshop Simulator release details are synchronized across the site", () => {
  const translationCard = translations.match(/<article class="translation-card reveal">[\s\S]*?href="bookshop-simulator\.html"[\s\S]*?<\/article>/)?.[0] || "";
  const newsCard = news.match(/<a class="latest-game-card" href="bookshop-simulator\.html">[\s\S]*?<\/a>/)?.[0] || "";
  assert.match(detail, /Verze 0\.3/);
  assert.match(detail, /v1\.1\.1258/);
  assert.match(detail, /Bookshop\.Simulator\.NioCZ\.zip/);
  assert.match(detail, /0\.21 MB/);
  assert.match(detail, /datetime="2026-09-14">14\. 9\. 2026/);
  assert.match(translationCard, /Verze češtiny 0\.3 · hra v1\.1\.1258/);
  assert.match(translationCard, /datetime="2026-09-14">14\. 9\. 2026/);
  assert.match(newsCard, /Čeština · 97 % · verze 0\.3 · hra v1\.1\.1258/);
  assert.match(newsCard, /datetime="2026-09-14">14\. 9\. 2026/);
  assert.match(sitemap, /bookshop-simulator\.html<\/loc>\s*<lastmod>2026-09-14<\/lastmod>/);
});

test("Bookshop Simulator uses the verified current Steam public build", () => {
  const game = status.games["bookshop-simulator"];
  assert.equal(game.appId, "3467040");
  assert.equal(game.supportedVersion, "v1.1.1258");
  assert.equal(game.verifiedBuildId, "25278775");
  assert.equal(game.currentBuildId, "25278775");
  assert.equal(resolveDisplayStatus(game).key, "functional");
  assert.equal(resolveDisplayStatus({ ...game, currentBuildId: "25278776" }).key, "pending");
  assert.match(detail, /store\.steampowered\.com\/app\/3467040/);
});

test("Bookshop Simulator keeps shared detail hooks and updated instructions", () => {
  for (const hook of ["data-game=\"bookshop-simulator\"", "data-game-status=\"bookshop-simulator\"", "data-download", "data-download-count", "data-comments-list"]) {
    assert.match(detail, new RegExp(hook));
  }
  assert.match(detail, /SmartScreen/);
  assert.match(detail, /install\.exe/);
  assert.match(detail, /Procházet \(Browse\)/);
  assert.match(detail, /Nainstalovat češtinu/);
  assert.match(detail, /Ověřit integritu herních souborů/);
  assert.match(sql, /'bookshop-simulator', 'Bookshop Simulator', '0\.3', 'v1\.1\.1258', date '2026-09-14'/);
  assert.match(sql, /steam_app_id = '3467040'/);
  assert.match(sql, /verified_build_id = '25278775'/);
});
