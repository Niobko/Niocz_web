import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolveDisplayStatus } from "../netlify/functions/_lib/game-status.mjs";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
const detail = read("parcel-simulator.html");
const index = read("index.html");
const translations = read("preklady.html");
const sitemap = read("sitemap.xml");
const script = read("script.js");
const status = JSON.parse(read("data/game-status.json"));
const migration = read("SQL EDITOR/SUPABASE-PARCEL-SIMULATOR.sql");
const commentsMigration = read("SQL EDITOR/SUPABASE-COMMENTS-SLUGS.sql");
const ratingsMigration = read("SQL EDITOR/SUPABASE-GAME-RATINGS.sql");

test("Parcel Simulator is registered consistently across the site", () => {
  for (const html of [index, translations]) {
    assert.match(html, /href="parcel-simulator\.html/);
    assert.match(html, /data-game-status="parcel-simulator"/);
    assert.match(html, /assets\/Parcel Simulator\/Parcel_hl\.avif/);
  }

  assert.match(sitemap, /https:\/\/nioczloc\.com\/parcel-simulator\.html/);
  assert.match(script, /'parcel-simulator': \{ name: 'Parcel Simulator'/);

  const game = status.games["parcel-simulator"];
  assert.equal(game.name, "Parcel Simulator");
  assert.equal(game.appId, "2424010");
  assert.equal(game.supportedVersion, "v2.0.1.3");
  assert.equal(game.verifiedBuildId, "24535906");
  assert.equal(game.currentBuildId, "24535906");
  assert.equal(resolveDisplayStatus(game).key, "functional");
  assert.equal(resolveDisplayStatus({ ...game, currentBuildId: "24535907" }).key, "pending");
});

test("detail uses the requested SEO, content and shared feature hooks", () => {
  assert.match(detail, /<title>Parcel Simulator – čeština, český překlad \| Nio Localization<\/title>/);
  assert.match(detail, /content="Čeština a český překlad pro hru Parcel Simulator ke stažení\. Návod na instalaci a novinky o překladu\."/);
  assert.match(detail, /<h1>Parcel Simulator – Čeština<\/h1>/);
  assert.match(detail, /<body data-game="parcel-simulator">/);
  assert.equal([...detail.matchAll(/data-game-status="parcel-simulator"/g)].length, 2);
  assert.match(detail, /data-comments-list/);
  assert.match(detail, /data-download data-game="parcel-simulator"/);
  assert.match(detail, /data-download-count/);
  assert.match(detail, /Parcel\.Simulator_NioCZ_v0\.1\.zip/);
  assert.match(detail, /0\.32 MB/);
  assert.match(detail, /1\. 9\. 2026/);
  assert.match(detail, /Kontrola ve hře<\/span><b>100 %/);
  assert.match(detail, /ParcelSimulator_CZ_P\.pak/);
  assert.match(detail, /Parcel Simulator\\parcel\\Content\\Paks\\/);
  assert.match(detail, /složka <code>parcel<\/code>/);
  assert.match(detail, /sloučení složek nebo přepsání souborů/);
  assert.match(detail, /ze složky <code>Content\\Paks\\<\/code>/);
  assert.match(detail, /Unity/);
  assert.match(script, /from\('game_ratings'\)/);
  assert.match(script, /bug-reports\.html\?game=\$\{encodeURIComponent\(gameSlug\)\}/);
});

test("all supplied images keep their exact names in the requested asset folder", () => {
  for (const name of ["Parcel_hl.avif", "Parcel_1.png", "Parcel_2.png", "Parcel_3.png", "Parcel_4.png", "Parcel_5.png"]) {
    assert.ok(existsSync(new URL(`assets/Parcel Simulator/${name}`, root)), `${name} must exist`);
  }

  assert.equal([...detail.matchAll(/assets\/Parcel Simulator\/Parcel_[1-5]\.png/g)].length, 10);
  assert.doesNotMatch(detail, /assets\/Parcel Simulator\/Parcel_hl\.avif/);
});

test("Supabase migrations whitelist the slug for every persisted feature", () => {
  assert.match(migration, /alter table public\.comments/i);
  assert.match(migration, /alter table public\.bug_reports/i);
  assert.match(migration, /alter table public\.game_ratings/i);
  assert.match(migration, /alter table public\.download_totals/i);
  assert.match(migration, /values \('parcel-simulator', 0\)/i);
  assert.match(migration, /create or replace function public\.register_download\(requested_game_slug text\)/i);
  assert.ok([...migration.matchAll(/'parcel-simulator'/g)].length >= 5);
  assert.match(commentsMigration, /'parcel-simulator'/);
  assert.ok([...ratingsMigration.matchAll(/'parcel-simulator'/g)].length >= 2);
});
