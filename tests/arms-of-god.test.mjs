import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveDisplayStatus } from "../netlify/functions/_lib/game-status.mjs";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
const detail = read("arms-of-god.html");
const index = read("index.html");
const translations = read("preklady.html");
const script = read("script.js");
const sitemap = read("sitemap.xml");
const status = JSON.parse(read("data/game-status.json"));
const databaseUpdate = read("SQL EDITOR/SUPABASE-ARMS-OF-GOD-V0.2.sql");

test("Arms of God v0.2 release details are consistent", () => {
  assert.match(detail, /Verze v0\.2/);
  assert.match(detail, /Arms of God · v0\.618/);
  assert.match(detail, /0\.18 MB/);
  assert.match(detail, /datetime="2026-09-21">21\. 9\. 2026/);
  assert.match(detail, /Arm\.of\.God_NioCZ\.zip/);
  assert.match(translations, /Verze překladu v0\.2 · hra v0\.618/);
  assert.match(index, /Čeština · 100 % · verze v0\.2 · hra v0\.618/);
  assert.match(sitemap, /arms-of-god\.html<\/loc>\s*<lastmod>2026-09-21<\/lastmod>/);
});

test("Arms of God installation and SmartScreen guidance are present", () => {
  assert.match(detail, /install\.exe/);
  assert.match(detail, /Procházet \(Browse\)/);
  assert.match(detail, /Nainstalovat češtinu/);
  assert.match(detail, /V nastavení jazyka přepněte jazyk na <code>Čeština<\/code>/);
  assert.match(detail, /Windows může při prvním spuštění zobrazit upozornění SmartScreen/);
  assert.match(detail, /ArmsOfGod_CZ_P\.pak/);
  assert.match(detail, /C:\\Program Files \(x86\)\\Steam\\steamapps\\common\\Arms of God\\ArmsOfGod\\Content\\Paks/);
});

test("Arms of God uses the verified current Steam public build", () => {
  const game = status.games["arms-of-god"];
  assert.equal(game.appId, "3100310");
  assert.equal(game.supportedVersion, "v0.618");
  assert.equal(game.verifiedBuildId, "25392212");
  assert.equal(game.currentBuildId, "25392212");
  assert.equal(game.lastSteamUpdate, "2026-09-19T21:58:40.000Z");
  assert.equal(resolveDisplayStatus(game).key, "functional");
  assert.equal(resolveDisplayStatus({ ...game, currentBuildId: "25392213" }).key, "pending");
  assert.match(detail, /store\.steampowered\.com\/app\/3100310/);
  assert.match(script, /'arms-of-god': \{[^\n]+verifiedBuildId: '25392212'[^\n]+currentBuildId: '25392212'/);
  assert.match(databaseUpdate, /steam_app_id = '3100310'/);
  assert.match(databaseUpdate, /verified_build_id = '25392212'/);
});

test("Arms of God stays wired into shared community hooks", () => {
  assert.equal([...detail.matchAll(/data-game-status="arms-of-god"/g)].length, 2);
  assert.match(detail, /<body data-game="arms-of-god">/);
  assert.match(detail, /data-download data-game="arms-of-god"/);
  assert.match(detail, /data-download-count/);
  assert.match(detail, /data-comments-list/);
});
