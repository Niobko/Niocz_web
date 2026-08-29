import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
const detail = read("powerwash-simulator-2.html");
const index = read("index.html");
const translations = read("preklady.html");
const sitemap = read("sitemap.xml");
const script = read("script.js");
const styles = read("style.css");
const status = JSON.parse(read("data/game-status.json"));
const migration = read("SUPABASE-POWERWASH-SIMULATOR-2.sql");

test("PowerWash Simulator 2 is registered across the site", () => {
  for (const html of [index, translations]) {
    assert.match(html, /href="powerwash-simulator-2\.html/);
    assert.match(html, /data-game-status="powerwash-simulator-2"/);
    assert.match(html, /assets\/Wash\/Wash_hl\.jpg/);
  }

  assert.match(sitemap, /https:\/\/nioczloc\.com\/powerwash-simulator-2\.html/);
  assert.match(script, /'powerwash-simulator-2': \{ name: 'PowerWash Simulator 2'/);
  assert.equal(status.games["powerwash-simulator-2"].appId, "2968420");
  assert.equal(status.games["powerwash-simulator-2"].supportedVersion, "v1.3.0");
  assert.equal(status.games["powerwash-simulator-2"].verifiedBuildId, "23737596");
  assert.equal(status.games["powerwash-simulator-2"].currentBuildId, "23737596");
});

test("detail uses the complete shared feature contract", () => {
  assert.match(detail, /<body data-game="powerwash-simulator-2">/);
  assert.equal([...detail.matchAll(/data-game-status="powerwash-simulator-2"/g)].length, 2);
  assert.match(detail, /data-comments-list/);
  assert.match(detail, /data-download data-game="powerwash-simulator-2"/);
  assert.match(detail, /data-download-count/);
  assert.match(detail, /PowerWash\.Simulator\.2_NioCZ_v0\.1\.zip/);
  assert.match(detail, /43\.9 MB/);
  assert.match(detail, /29\. 8\. 2026/);
  assert.match(detail, /Kontrola ve hře<\/span><b>75 %/);
  assert.match(script, /bug-reports\.html\?game=\$\{encodeURIComponent\(gameSlug\)\}/);
  assert.match(script, /className = 'game-rating-card'/);
  assert.match(script, /className = 'version-status-panel'/);
  assert.match(script, /dataset\.gameStatusAdmin/);
  assert.match(styles, /\.detail-hero \.hero-glow\{right:0;max-width:100%\}/);
});

test("all supplied images retain their exact names and extensions", () => {
  for (const name of ["Wash_hl.jpg", "wash_1.png", "wash_2.png", "wash_3.png", "wash_4.png", "wash_5.png"]) {
    assert.ok(existsSync(new URL(`assets/Wash/${name}`, root)), `${name} must exist`);
  }

  assert.equal([...detail.matchAll(/assets\/Wash\/wash_[1-5]\.png/g)].length, 10);
});

test("Supabase migration enables all persisted features", () => {
  assert.match(migration, /alter table public\.comments/i);
  assert.match(migration, /alter table public\.bug_reports/i);
  assert.match(migration, /alter table public\.game_ratings/i);
  assert.match(migration, /alter table public\.download_totals/i);
  assert.match(migration, /values \('powerwash-simulator-2', 0\)/i);
  assert.match(migration, /create or replace function public\.register_download\(requested_game_slug text\)/i);
  assert.ok([...migration.matchAll(/'powerwash-simulator-2'/g)].length >= 5);
});
