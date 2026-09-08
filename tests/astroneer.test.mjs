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
    ["href", "https://example.test/astroneer.zip"]
  ]);
  const classes = new Set(["button", "button-primary"]);
  return {
    dataset: { game: "astroneer" },
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
    body: { dataset: { game: "astroneer" } },
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

const astroneer = statusConfig.games.astroneer;
const withStatus = status => ({
  astroneer: {
    ...astroneer,
    statusOverride: {
      status,
      verifiedBuildId: status === "functional" ? astroneer.currentBuildId : null
    }
  }
});

test("Astroneer download follows all three resolved translation states", () => {
  context.testApi.setReady(true);

  context.testApi.applyGameStatuses(withStatus("functional"));
  assert.equal(button.dataset.downloadState, "functional");
  assert.equal(button.getAttribute("href"), "https://example.test/astroneer.zip");
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
  assert.equal(button.getAttribute("href"), "https://example.test/astroneer.zip");
  assert.equal(button.getAttribute("aria-disabled"), null);
  assert.equal(button.innerHTML, "Stáhnout překlad");
});


test("Astroneer blocks downloads when Steam detects a new build", () => {
  context.testApi.setReady(true);
  context.testApi.applyGameStatuses({astroneer: {...astroneer, currentBuildId: String(Number(astroneer.currentBuildId) + 1)}});
  assert.equal(button.dataset.downloadState, "pending");
  assert.equal(button.hasAttribute("href"), false);
  context.testApi.applyGameStatuses(withStatus("functional"));
  assert.equal(button.dataset.downloadState, "functional");
  assert.equal(button.hasAttribute("href"), true);
});
