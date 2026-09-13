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
  assert.equal(game.supportedVersion, "v0.8.9");
  assert.equal(game.verifiedBuildId, "25259567");
  assert.equal(game.currentBuildId, "25259567");
  assert.equal(game.lastSteamUpdate, "2026-09-13T08:39:54.000Z");
  assert.equal(resolveDisplayStatus(game).key, "functional");
  assert.equal(resolveDisplayStatus({ ...game, currentBuildId: "25259568" }).key, "pending");
  assert.match(script, /'breathedge-2': \{ name: 'Breathedge 2', appId: '2412960', supportedVersion: 'v0\.8\.9', verifiedBuildId: '25259567', currentBuildId: '25259567'/);
  assert.match(translations, /Breathedge 2[\s\S]*?datetime="2026-09-13">13\. 9\. 2026/);
  assert.match(index, /Čeština · v0\.3 · 100 %[\s\S]*?<h4>Breathedge 2<\/h4>[\s\S]*?datetime="2026-09-13">13\. 9\. 2026/);
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
  assert.match(detail, /Breathedge\.2_NioCZ\.zip/);
  assert.match(detail, /https:\/\/github\.com\/Niobko\/NioCZ-Cestiny\/releases\/download\/Breathedg2_NioCZ\/Breathedge\.2_NioCZ\.zip/);
  assert.match(detail, /0\.18 MB/);
  assert.match(detail, /13\. 9\. 2026/);
  assert.match(detail, /Verze překladu v0\.3/);
  assert.match(detail, /Breathedge 2 · v0\.8\.9/);
  assert.match(detail, /Steam App ID<\/dt><dd><a href="https:\/\/store\.steampowered\.com\/app\/2412960\//);
  assert.match(detail, /Kontrola ve hře<\/span><b>75 %/);
  assert.match(detail, /Breathedge2_CZ_P\.pak/);
  assert.match(detail, /Breathedge2_CZ_P\.utoc/);
  assert.match(detail, /Breathedge2_CZ_P\.ucas/);
  assert.match(detail, /C:\.\.\.\\Breathedge2\\Breathedge2\\Content\\Paks/);
  assert.match(detail, /install\.exe/);
  assert.match(detail, /Procházet \(Browse\)/);
  assert.match(detail, /Nainstalovat češtinu/);
  assert.match(detail, /V nastavení jazyka přepněte jazyk na <strong>Čeština<\/strong>/);
  assert.match(detail, /Windows může při prvním spuštění zobrazit upozornění SmartScreen/);
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
