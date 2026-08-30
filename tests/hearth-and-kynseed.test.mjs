import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
const hearth = read("hearth-and-hamlet.html");
const kynseed = read("kynseed.html");
const index = read("index.html");
const translations = read("preklady.html");
const sitemap = read("sitemap.xml");
const script = read("script.js");
const styles = read("style.css");
const status = JSON.parse(read("data/game-status.json"));
const migration = read("SUPABASE-HEARTH-AND-KYNSEED.sql");

test("both games are registered across the public site", () => {
  for (const [slug, page] of [["hearth-and-hamlet", "hearth-and-hamlet.html"], ["kynseed", "kynseed.html"]]) {
    assert.match(index, new RegExp(`href="${page.replace(".", "\\.")}"`));
    assert.match(index, new RegExp(`data-game-status="${slug}"`));
    assert.match(translations, new RegExp(`data-game-status="${slug}"`));
    assert.match(sitemap, new RegExp(`https://nioczloc\\.com/${page.replace(".", "\\.")}`));
    assert.ok(status.games[slug]);
  }

  assert.equal(status.games["hearth-and-hamlet"].appId, "4315040");
  assert.equal(status.games["hearth-and-hamlet"].supportedVersion, "v1.0.04");
  assert.equal(status.games["hearth-and-hamlet"].verifiedBuildId, "24970582");
  assert.equal(status.games["hearth-and-hamlet"].currentBuildId, "25004659");
  assert.equal(status.games.kynseed.appId, "758870");
  assert.equal(status.games.kynseed.supportedVersion, "v1.3");
  assert.equal(status.games.kynseed.currentBuildId, "24006355");
  assert.match(script, /'hearth-and-hamlet': \{ name: 'Hearth and Hamlet'/);
  assert.match(script, /kynseed: \{ name: 'Kynseed'/);
});

test("both details keep all shared community, status and download hooks", () => {
  for (const [detail, slug] of [[hearth, "hearth-and-hamlet"], [kynseed, "kynseed"]]) {
    assert.match(detail, new RegExp(`<body data-game="${slug}">`));
    assert.match(detail, new RegExp(`data-game-status="${slug}"`));
    assert.match(detail, /data-comments-list/);
    assert.match(detail, new RegExp(`data-download data-game="${slug}"`));
    assert.match(detail, /data-download-count/);
  }

  assert.match(script, /bug-reports\.html\?game=\$\{encodeURIComponent\(gameSlug\)\}/);
  assert.match(script, /className = 'game-rating-card'/);
  assert.match(script, /className = 'version-status-panel'/);
  assert.match(script, /dataset\.gameStatusAdmin/);
  assert.match(styles, /\.detail-grid>\.download-card\{position:static;top:auto\}/);
});

test("the supplied cover and gallery assets use their real extensions", () => {
  for (const name of ["Hearth_hl.png", "Hearth_1.png", "Hearth_2.png", "Hearth_3.png", "Hearth_4.png", "Hearth_5.png"]) {
    assert.ok(existsSync(new URL(`assets/Hearth_and_Hamlet/${name}`, root)), `${name} must exist`);
  }
  for (const name of ["Kynseed_hl.avif", "Kynseed_1.png", "Kynseed_2.png", "Kynseed_3.png", "Kynseed_4.png", "Kynseed_5.png"]) {
    assert.ok(existsSync(new URL(`assets/Kynseed/${name}`, root)), `${name} must exist`);
  }

  assert.match(index, /assets\/Hearth_and_Hamlet\/Hearth_hl\.png/);
  assert.match(index, /assets\/Kynseed\/Kynseed_hl\.avif/);
  assert.equal([...hearth.matchAll(/assets\/Hearth_and_Hamlet\/Hearth_[1-5]\.png/g)].length, 10);
  assert.equal([...kynseed.matchAll(/assets\/Kynseed\/Kynseed_[1-5]\.png/g)].length, 10);
});

test("engine and uninstall guidance are technically consistent", () => {
  assert.match(hearth, /Godot Engine/);
  assert.doesNotMatch(hearth, /Custom Engine \(Java\)/);
  assert.match(kynseed, /Custom Engine \(MonoGame\)/);
  assert.match(kynseed, /neodinstalovává se přes seznam aplikací ve Windows/);
  assert.match(kynseed, /Ověřit integritu herních souborů/);
  assert.doesNotMatch(kynseed, /Instalátor obnoví původní anglický soubor hry/);
});

test("the Supabase migration enables all persisted features for both slugs", () => {
  for (const slug of ["hearth-and-hamlet", "kynseed"]) {
    assert.match(migration, new RegExp(`'${slug}'`));
  }
  assert.match(migration, /alter table public\.comments/i);
  assert.match(migration, /alter table public\.bug_reports/i);
  assert.match(migration, /alter table public\.game_ratings/i);
  assert.match(migration, /alter table public\.download_totals/i);
  assert.match(migration, /values\s+\('hearth-and-hamlet', 0\),\s+\('kynseed', 0\)/i);
  assert.match(migration, /create or replace function public\.register_download\(requested_game_slug text\)/i);
});
