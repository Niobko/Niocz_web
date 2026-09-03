import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const detail = readFileSync(new URL("e-shop-tycoon.html", root), "utf8");
const index = readFileSync(new URL("index.html", root), "utf8");
const translations = readFileSync(new URL("preklady.html", root), "utf8");
const sitemap = readFileSync(new URL("sitemap.xml", root), "utf8");
const status = JSON.parse(readFileSync(new URL("data/game-status.json", root), "utf8"));
const databaseMigration = readFileSync(new URL("SQL EDITOR/SUPABASE-E-SHOP-TYCOON.sql", root), "utf8");

test("E-Shop Tycoon is registered across the public site", () => {
  assert.match(index, /href="e-shop-tycoon\.html"/);
  assert.match(translations, /data-game-status="e-shop-tycoon"/);
  assert.match(sitemap, /https:\/\/nioczloc\.com\/e-shop-tycoon\.html/);
  assert.equal(status.games["e-shop-tycoon"].appId, "4249850");
  assert.equal(status.games["e-shop-tycoon"].supportedVersion, "v1.0.8-17ec132");
  assert.match(databaseMigration, /'e-shop-tycoon'/);
  assert.match(databaseMigration, /alter table public\.comments/i);
  assert.match(databaseMigration, /alter table public\.game_ratings/i);
  assert.match(databaseMigration, /insert into public\.download_totals/i);
  assert.match(databaseMigration, /download_totals_game_slug_check_v2/i);
  assert.match(databaseMigration, /validate constraint download_totals_game_slug_check_v2/i);
  assert.match(databaseMigration, /on conflict \(game_slug\) do nothing/i);
  assert.match(databaseMigration, /create function public\.register_download\(requested_game_slug text\)/i);
  assert.match(databaseMigration, /set download_count = download_count \+ 1/i);
  assert.match(databaseMigration, /grant execute on function public\.register_download\(text\) to anon, authenticated/i);
});

test("E-Shop Tycoon detail keeps every shared community and download hook", () => {
  assert.match(detail, /<body data-game="e-shop-tycoon">/);
  assert.match(detail, /data-comments-list/);
  assert.match(detail, /data-download data-game="e-shop-tycoon"/);
  assert.match(detail, /data-download-count/);
  assert.match(detail, /E-Shop\.Tycoon\.NioCZ\.v\.0\.2\.zip/);
  assert.match(detail, /EShopNioCZ_P\.pak/);
});

test("the supplied cover and five gallery images are present", () => {
  for (const name of ["eShop_hl.png", "eShop_1.png", "eShop_2.png", "eShop_3.png", "eShop_4.png", "eShop_5.png"]) {
    assert.ok(existsSync(new URL(`assets/eShop/${name}`, root)), `${name} must exist`);
  }
  assert.equal([...detail.matchAll(/assets\/eShop\/eShop_[1-5]\.png/g)].length, 10);
});
