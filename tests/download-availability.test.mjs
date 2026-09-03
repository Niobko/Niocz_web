import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const script = readFileSync(new URL("script.js", root), "utf8");
const styles = readFileSync(new URL("style.css", root), "utf8");
const statusConfig = JSON.parse(readFileSync(new URL("data/game-status.json", root), "utf8"));

const start = script.indexOf("const gameStatusDefinitions =");
const end = script.indexOf("const loadGameStatuses =");
assert.notEqual(start, -1, "status definitions must remain available");
assert.notEqual(end, -1, "status loader must remain available");

const createDownloadButton = () => {
  const attributes = new Map([
    ["href", "https://example.test/bombanana.zip"]
  ]);
  const classes = new Set(["button", "button-primary"]);
  return {
    dataset: { game: "bombanana" },
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
    body: { dataset: { game: "bombanana" } },
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

const bombanana = statusConfig.games.bombanana;
const withStatus = status => ({
  bombanana: {
    ...bombanana,
    statusOverride: {
      status,
      verifiedBuildId: status === "functional" ? bombanana.currentBuildId : null
    }
  }
});

test("BOMBANANA download follows all three resolved translation states", () => {
  context.testApi.setReady(true);

  context.testApi.applyGameStatuses(withStatus("functional"));
  assert.equal(button.dataset.downloadState, "functional");
  assert.equal(button.getAttribute("href"), "https://example.test/bombanana.zip");
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
  assert.equal(button.getAttribute("href"), "https://example.test/bombanana.zip");
  assert.equal(button.getAttribute("aria-disabled"), null);
  assert.equal(button.innerHTML, "Stáhnout překlad");
});

test("download stays locked until combined status data is ready", () => {
  context.testApi.setReady(false);
  context.testApi.applyGameStatuses(withStatus("functional"));
  assert.equal(button.dataset.downloadState, "loading");
  assert.equal(button.hasAttribute("href"), false);
  assert.equal(button.getAttribute("aria-disabled"), "true");
});

test("shared click guard runs before Supabase counter registration", () => {
  const handlerStart = script.indexOf("document.querySelector('[data-download]')?.addEventListener");
  const handlerEnd = script.indexOf("if (db) {", handlerStart);
  const handler = script.slice(handlerStart, handlerEnd);
  assert.match(handler, /status\?\.key === 'functional'/);
  assert.match(handler, /if \(!downloadAllowed\)/);
  assert.ok(handler.indexOf("if (!downloadAllowed)") < handler.indexOf("register_download"));
  assert.match(styles, /\[data-download\]\[aria-disabled="true"\]/);
});
