import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const detail = readFileSync(new URL("alchemy-factory.html", root), "utf8");
const index = readFileSync(new URL("index.html", root), "utf8");
const translations = readFileSync(new URL("preklady.html", root), "utf8");
const sitemap = readFileSync(new URL("sitemap.xml", root), "utf8");
const script = readFileSync(new URL("script.js", root), "utf8");
const styles = readFileSync(new URL("style.css", root), "utf8");
const imageStyles = readFileSync(new URL("image.css", root), "utf8");
const status = JSON.parse(readFileSync(new URL("data/game-status.json", root), "utf8"));
const databaseMigration = readFileSync(new URL("SUPABASE-ALCHEMY-FACTORY.sql", root), "utf8");

test("Alchemy Factory is registered across the public site", () => {
  assert.match(index, /href="alchemy-factory\.html"/);
  assert.match(index, /data-game-status="alchemy-factory"/);
  assert.match(translations, /data-game-status="alchemy-factory"/);
  assert.match(sitemap, /https:\/\/nioczloc\.com\/alchemy-factory\.html/);
  assert.equal(status.games["alchemy-factory"].appId, "3669570");
  assert.equal(status.games["alchemy-factory"].supportedVersion, "v0.5.4539");
  assert.equal(status.games["alchemy-factory"].verifiedBuildId, "23962166");
  assert.equal(status.games["alchemy-factory"].currentBuildId, "23962166");
  assert.match(script, /'alchemy-factory': \{ name: 'Alchemy Factory'/);
});

test("Alchemy Factory detail keeps every shared community and download hook", () => {
  assert.match(detail, /<body data-game="alchemy-factory">/);
  assert.match(detail, /data-game-status="alchemy-factory"/);
  assert.match(detail, /data-comments-list/);
  assert.match(detail, /data-download data-game="alchemy-factory"/);
  assert.match(detail, /data-download-count/);
  assert.match(detail, /AlchemyFactory_NioCZ_v0\.1\.zip/);
  assert.match(detail, /Aktuálně podporovaná verze hry: v0\.5\.4539/);
  assert.doesNotMatch(detail, /v\s+0\.5\.4539/);
  assert.match(detail, /Unreal Engine/);
});

test("the supplied cover and five gallery images are present and referenced", () => {
  for (const name of ["Alchemy_hl.jpg", "Alchemy_1.png", "Alchemy_2.png", "Alchemy_3.png", "Alchemy_4.png", "Alchemy_5.png"]) {
    assert.ok(existsSync(new URL(`assets/AlchemyFactory/${name}`, root)), `${name} must exist`);
  }
  assert.equal([...detail.matchAll(/assets\/AlchemyFactory\/Alchemy_[1-5]\.png/g)].length, 10);
  assert.match(index, /assets\/AlchemyFactory\/Alchemy_hl\.jpg/);
  assert.match(translations, /assets\/AlchemyFactory\/Alchemy_hl\.jpg/);
});

test("long installation paths cannot widen the mobile detail layout", () => {
  assert.match(styles, /\.detail-title>div:first-child,\.detail-main\{min-width:0\}/);
  assert.match(styles, /\.detail-main\{grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(styles, /\.detail-grid\{grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(imageStyles, /\.folder-tree\s*\{[^}]*overflow-x:\s*auto/);
});

test("Supabase migration enables comments, ratings and the download counter", () => {
  assert.match(databaseMigration, /'alchemy-factory'/);
  assert.match(databaseMigration, /alter table public\.comments/i);
  assert.match(databaseMigration, /alter table public\.game_ratings/i);
  assert.match(databaseMigration, /alter table public\.download_totals/i);
  assert.match(databaseMigration, /insert into public\.download_totals/i);
  assert.match(databaseMigration, /values \('alchemy-factory', 0\)/i);
  assert.match(databaseMigration, /create function public\.register_download\(requested_game_slug text\)/i);
});
