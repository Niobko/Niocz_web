import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const script = readFileSync(new URL("script.js", root), "utf8");
const styles = readFileSync(new URL("style.css", root), "utf8");
const statusConfig = JSON.parse(readFileSync(new URL("data/game-status.json", root), "utf8"));
const detail = readFileSync(new URL("ready-or-not.html", root), "utf8");
const index = readFileSync(new URL("index.html", root), "utf8");
const translations = readFileSync(new URL("preklady.html", root), "utf8");
const sitemap = readFileSync(new URL("sitemap.xml", root), "utf8");
const databaseMigration = readFileSync(new URL("SQL EDITOR/SUPABASE-READY-OR-NOT.sql", root), "utf8");

const start = script.indexOf("const gameStatusDefinitions =");
const end = script.indexOf("const loadGameStatuses =");
assert.notEqual(start, -1, "status definitions must remain available");
assert.notEqual(end, -1, "status loader must remain available");

const createDownloadButton = () => {
  const attributes = new Map([
    ["href", "https://example.test/readyOrNot.zip"]
  ]);
  const classes = new Set(["button", "button-primary"]);
  return {
    dataset: { game: "ready-or-not" },
    innerHTML: "Stáhnout překlad",
    textContent: "Stáhnout překlad",
    classList: {
      toggle(name, enabled) {
        if (enabled) classes.add(name);
        else classes.delete(name);
      },
      contains(name) {
        return classes.has(name);
      }
    },
    getAttribute(name) {
      return attributes.has(name) ? attributes.get(name) : null;
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    hasAttribute(name) {
      return attributes.has(name);
    }
  };
};

const button = createDownloadButton();
const context = {
  document: {
    body: { dataset: { game: "ready-or-not" } },
    querySelectorAll(selector) {
      return selector === "[data-download]" ? [button] : [];
    }
  }
};
vm.createContext(context);
vm.runInContext(`${script.slice(start, end)}\nthis.testApi = {
  applyGameStatuses,
  setReady(value) { gameStatusesReady = value; }
};`, context);

const readyOrNot = statusConfig.games["ready-or-not"];
const withStatus = status => ({
  "ready-or-not": {
    ...readyOrNot,
    statusOverride: {
      status,
      verifiedBuildId: status === "functional" ? readyOrNot.currentBuildId : null
    }
  }
});

test("Ready or Not download follows all three resolved translation states", () => {
  context.testApi.setReady(true);

  context.testApi.applyGameStatuses(withStatus("functional"));
  assert.equal(button.dataset.downloadState, "functional");
  assert.equal(button.getAttribute("href"), "https://example.test/readyOrNot.zip");
  assert.equal(button.getAttribute("aria-disabled"), null);
  assert.equal(button.innerHTML, "Stáhnout překlad");

  context.testApi.applyGameStatuses(withStatus("pending"));
  assert.equal(button.dataset.downloadState, "pending");
  assert.equal(button.hasAttribute("href"), false);
  assert.equal(button.getAttribute("aria-disabled"), "true");
  assert.equal(button.textContent, "Stahování dočasně pozastaveno");

  context.testApi.applyGameStatuses(withStatus("broken"));
  assert.equal(button.dataset.downloadState, "broken");
  assert.equal(button.hasAttribute("href"), false);
  assert.equal(button.getAttribute("aria-disabled"), "true");

  context.testApi.applyGameStatuses(withStatus("functional"));
  assert.equal(button.dataset.downloadState, "functional");
  assert.equal(button.getAttribute("href"), "https://example.test/readyOrNot.zip");
  assert.equal(button.getAttribute("aria-disabled"), null);
  assert.equal(button.innerHTML, "Stáhnout překlad");
});


test("Ready or Not blocks downloads when Steam detects a new build", () => {
  context.testApi.setReady(true);
  context.testApi.applyGameStatuses({"ready-or-not": {...readyOrNot, currentBuildId: String(Number(readyOrNot.currentBuildId) + 1)}});
  assert.equal(button.dataset.downloadState, "pending");
  assert.equal(button.hasAttribute("href"), false);
  context.testApi.applyGameStatuses(withStatus("functional"));
  assert.equal(button.dataset.downloadState, "functional");
  assert.equal(button.hasAttribute("href"), true);
});

test("Ready or Not is registered across the site with every supplied image", () => {
  assert.match(index, /href="ready-or-not\.html"/);
  assert.match(index, /assets\/Ready%20or%20Not\/Ready_hl\.jpg/);
  assert.match(translations, /data-game-status="ready-or-not"/);
  assert.match(translations, /assets\/Ready%20or%20Not\/Ready_hl\.jpg/);
  assert.match(sitemap, /https:\/\/nioczloc\.com\/ready-or-not\.html/);

  for (const name of ["Ready_hl.jpg", "Ready_1.png", "Ready_2.png", "Ready_3.png", "Ready_4.png", "Ready_5.png"]) {
    assert.ok(existsSync(new URL(`assets/Ready or Not/${name}`, root)), `${name} must exist`);
  }
  assert.equal([...detail.matchAll(/assets\/Ready%20or%20Not\/Ready_[1-5]\.png/g)].length, 10);
});

test("Ready or Not detail keeps the requested data and shared hooks", () => {
  assert.match(detail, /<title>Ready or Not – čeština, český překlad \| Nio Localization<\/title>/);
  assert.match(detail, /<body data-game="ready-or-not">/);
  assert.match(detail, /data-comments-list/);
  assert.match(detail, /data-download data-game="ready-or-not"/);
  assert.match(detail, /data-download-count/);
  assert.match(detail, /ReadyOrNot_NioCZ\.zip/);
  assert.match(detail, /Aktuálně podporovaná verze hry: v1\.5\.2/);
  assert.equal(statusConfig.games["ready-or-not"].appId, "1144200");
  assert.equal(statusConfig.games["ready-or-not"].verifiedBuildId, "24942528");
  assert.match(databaseMigration, /'ready-or-not'/);
  assert.match(databaseMigration, /alter table public\.comments/i);
  assert.match(databaseMigration, /alter table public\.bug_reports/i);
  assert.match(databaseMigration, /alter table public\.game_ratings/i);
  assert.match(databaseMigration, /alter table public\.download_totals/i);
  assert.match(databaseMigration, /values \('ready-or-not', 0\)/i);
});
