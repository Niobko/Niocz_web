import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
const detail = read("warhounds.html");
const index = read("index.html");
const translations = read("preklady.html");
const sitemap = read("sitemap.xml");
const script = read("script.js");
const commentsSql = read("SUPABASE-COMMENTS-SLUGS.sql");
const ratingsSql = read("SUPABASE-GAME-RATINGS.sql");
const migrationSql = read("SUPABASE-WARHOUNDS.sql");
const status = JSON.parse(read("data/game-status.json"));

test("Warhounds is registered across the public site", () => {
  assert.ok(status.games.warhounds);
  assert.match(index, /href="warhounds\.html"/);
  assert.match(index, /data-game-status="warhounds"/);
  assert.match(translations, /href="warhounds\.html"/);
  assert.match(translations, /data-game-status="warhounds"/);
  assert.match(sitemap, /https:\/\/nioczloc\.com\/warhounds\.html/);
});

test("Warhounds detail keeps every shared community and download hook", () => {
  assert.match(detail, /<body data-game="warhounds">/);
  assert.match(detail, /data-game-status="warhounds"/);
  assert.match(detail, /data-download data-game="warhounds"/);
  assert.match(detail, /data-download-count/);
  assert.match(detail, /data-comments-list/);
  assert.match(commentsSql, /'warhounds'/);
  assert.match(ratingsSql, /'warhounds'/);
});

test("Warhounds has a local-file status fallback", () => {
  assert.match(script, /warhounds:\s*\{[^}]*supportedVersion:\s*'v1\.0\.1'/);
  assert.match(script, /warhounds:\s*\{[^}]*manualStatus:\s*'functional'/);
});

test("the Warhounds migration enables every persisted feature", () => {
  assert.match(migrationSql, /alter table public\.comments/);
  assert.match(migrationSql, /alter table public\.bug_reports/);
  assert.match(migrationSql, /alter table public\.game_ratings/);
  assert.match(migrationSql, /alter table public\.download_totals/);
  assert.match(migrationSql, /values \('warhounds', 0\)/);
  assert.match(migrationSql, /create or replace function public\.register_download/);
});

test("the supplied Warhounds cover and gallery images are present and referenced", () => {
  const assets = [
    "warhounds_hl.png",
    "Warhounds_1.png",
    "Warhounds_2.png",
    "Warhounds_3.png",
    "Warhounds_4.png",
    "Warhounds_5.png"
  ];

  for (const asset of assets) {
    assert.ok(existsSync(new URL(`assets/Warhounds/${asset}`, root)), `${asset} is missing`);
    const listingMarkup = asset === "warhounds_hl.png" ? `${index}\n${translations}` : detail;
    assert.match(listingMarkup, new RegExp(`assets/Warhounds/${asset.replace(".", "\\.")}`));
  }
});

test("Warhounds release data and installation guidance match the supplied version", () => {
  assert.equal(status.games.warhounds.supportedVersion, "v1.0.1");
  assert.match(detail, /Verze v0\.1/);
  assert.match(detail, /Warhounds_NioCZ_0\.1_Setup\.exe/);
  assert.match(detail, /Čeština se načítá místo anglické lokalizace\./);
  assert.match(detail, /Ověřit integritu herních souborů/);
  assert.match(detail, /Warhounds_NioCZ_v0\.1\.zip/);
  assert.match(detail, /3\.83 MB/);
  assert.match(detail, /datetime="2026-08-30"/);
});
