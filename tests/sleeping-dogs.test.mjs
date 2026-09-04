import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolveDisplayStatus } from "../netlify/functions/_lib/game-status.mjs";

const root = new URL("../", import.meta.url);
const read = file => readFileSync(new URL(file, root), "utf8");
const detail = read("sleeping-dogs.html");
const translations = read("preklady.html");
const index = read("index.html");
const sitemap = read("sitemap.xml");
const script = read("script.js");
const status = JSON.parse(read("data/game-status.json"));
const migration = read("SQL EDITOR/SUPABASE-SLEEPING-DOGS.sql");
const commentsMigration = read("SQL EDITOR/SUPABASE-COMMENTS-SLUGS.sql");
const ratingsMigration = read("SQL EDITOR/SUPABASE-GAME-RATINGS.sql");

test("Sleeping Dogs is registered consistently across the site", () => {
  for (const html of [index, translations]) {
    assert.match(html, /href="sleeping-dogs\.html/);
    assert.match(html, /data-game-status="sleeping-dogs"/);
    assert.match(html, /assets\/Sleeping-Dogs\/Dogs_hl\.jpg/);
  }

  assert.match(sitemap, /https:\/\/nioczloc\.com\/sleeping-dogs\.html/);
  assert.match(script, /'sleeping-dogs': \{ name: 'Sleeping Dogs'/);

  const game = status.games["sleeping-dogs"];
  assert.equal(game.name, "Sleeping Dogs");
  assert.equal(game.appId, "307690");
  assert.equal(game.supportedVersion, "v1.0");
  assert.equal(game.verifiedBuildId, "979344");
  assert.equal(game.currentBuildId, "979344");
  assert.equal(resolveDisplayStatus(game).key, "functional");
  assert.equal(resolveDisplayStatus({ ...game, currentBuildId: "979345" }).key, "pending");
});

test("Sleeping Dogs detail includes the supplied content and all shared hooks", () => {
  assert.match(detail, /<title>Sleeping Dogs – čeština, český překlad \| Nio Localization<\/title>/);
  assert.match(detail, /content="Čeština a český překlad pro hru Sleeping Dogs ke stažení\. Návod na instalaci a novinky o překladu\."/);
  assert.match(detail, /<h1>Sleeping Dogs – Čeština<\/h1>/);
  assert.match(detail, /<body data-game="sleeping-dogs">/);
  assert.equal([...detail.matchAll(/data-game-status="sleeping-dogs"/g)].length, 2);
  assert.match(detail, /data-comments-list/);
  assert.match(detail, /data-download data-game="sleeping-dogs"/);
  assert.match(detail, /data-download-count/);
  assert.match(detail, /Sleeping-Dogs\.Definitive\.Edition_NioCZ_v0\.1\.zip/);
  assert.match(detail, /3\.87 MB/);
  assert.match(detail, /4\. 9\. 2026/);
  assert.match(detail, /Kontrola ve hře<\/span><b>65 %/);
  assert.match(detail, /UPOZORNĚNÍ WINDOWS SMARTSCREEN/);
  assert.match(detail, /Sleeping_Dogs_Definitive_Edition_NioCZ_v0\.1\.exe/);
  assert.match(detail, /Sleeping Dogs: Definitive Edition – Čeština/);
  assert.match(detail, /Čeština se nainstaluje automaticky/);
  assert.match(detail, /Při odinstalaci se obnoví původní soubory hry/);
  assert.match(detail, /United Front Games/);
});

test("all supplied Sleeping Dogs images are wired to their intended roles", () => {
  const names = ["Dogs_hl.jpg", "Dogs_1.png", "Dogs_2.png", "Dogs_3.png", "Dogs_4.png", "Dogs_5.png"];
  for (const name of names) {
    assert.ok(existsSync(new URL(`assets/Sleeping-Dogs/${name}`, root)), `${name} must exist`);
  }

  assert.equal([...detail.matchAll(/assets\/Sleeping-Dogs\/Dogs_[1-5]\.png/g)].length, 10);
  assert.doesNotMatch(detail, /assets\/Sleeping-Dogs\/Dogs_hl\.jpg/);
});

test("Sleeping Dogs database migration enables every community feature", () => {
  assert.match(migration, /alter table public\.comments/i);
  assert.match(migration, /alter table public\.bug_reports/i);
  assert.match(migration, /alter table public\.game_ratings/i);
  assert.match(migration, /alter table public\.download_totals/i);
  assert.match(migration, /values \('sleeping-dogs', 0\)/i);
  assert.match(migration, /create or replace function public\.register_download\(requested_game_slug text\)/i);
  assert.ok([...migration.matchAll(/'sleeping-dogs'/g)].length >= 5);
  assert.match(commentsMigration, /'sleeping-dogs'/);
  assert.ok([...ratingsMigration.matchAll(/'sleeping-dogs'/g)].length >= 2);
});
