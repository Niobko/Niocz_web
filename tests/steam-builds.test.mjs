import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { isManualRefreshRequest } from "../netlify/functions/game-status.mjs";
import { resolveDisplayStatus } from "../netlify/functions/_lib/game-status.mjs";
import {
  applySteamSnapshot,
  fetchSteamBuildSnapshot,
  isSteamSnapshotFresh,
  mergeSteamSnapshots,
  parsePublicBranch
} from "../netlify/functions/_lib/steam-builds.mjs";

const root = new URL("../", import.meta.url);
const statusConfig = JSON.parse(readFileSync(new URL("data/game-status.json", root), "utf8"));

test("public Steam branch metadata exposes the build and real update time", () => {
  assert.deepEqual(parsePublicBranch({
    depots: { branches: { public: { buildid: "24885009", timeupdated: "1787356800" } } }
  }), {
    currentBuildId: "24885009",
    lastSteamUpdate: "2026-08-22T00:00:00.000Z"
  });
});

test("one anonymous PICS request checks every configured Steam App ID", async () => {
  let requestedAppIds = [];
  class FakeSteamUser extends EventEmitter {
    logOn(details) {
      assert.deepEqual(details, { anonymous: true });
      queueMicrotask(() => this.emit("loggedOn"));
    }

    getProductInfo(appIds, packages, includeTokens, callback) {
      requestedAppIds = appIds;
      assert.deepEqual(packages, []);
      assert.equal(includeTokens, true);
      const apps = Object.fromEntries(appIds.map((appId, index) => [String(appId), {
        appinfo: {
          depots: { branches: { public: { buildid: String(9000 + index), timeupdated: "1787356800" } } }
        }
      }]));
      queueMicrotask(() => callback(null, apps));
    }

    logOff() {}
  }

  const snapshot = await fetchSteamBuildSnapshot(statusConfig.games, {
    SteamUser: FakeSteamUser,
    now: () => new Date("2026-08-30T12:00:00Z"),
    timeoutMs: 1000
  });

  const configuredAppIds = [...new Set(Object.values(statusConfig.games).map(game => Number(game.appId)))];
  assert.deepEqual(requestedAppIds.sort((a, b) => a - b), configuredAppIds.sort((a, b) => a - b));
  assert.equal(Object.keys(snapshot.games).length, Object.keys(statusConfig.games).length);
  assert.deepEqual(snapshot.errors, {});
});

test("a partial hourly result keeps the previous build only for the failed game", () => {
  const configured = {
    first: { appId: "1" },
    second: { appId: "2" }
  };
  const previous = {
    lastCheckedAt: "2026-08-30T10:00:00Z",
    games: {
      first: { appId: "1", currentBuildId: "100", lastSteamUpdate: "2026-08-29T10:00:00Z" },
      second: { appId: "2", currentBuildId: "200", lastSteamUpdate: "2026-08-29T10:00:00Z" }
    }
  };
  const fresh = {
    lastCheckedAt: "2026-08-30T11:00:00Z",
    games: {
      first: { appId: "1", currentBuildId: "101", lastSteamUpdate: "2026-08-30T10:55:00Z" }
    },
    errors: { second: "missing" }
  };

  const merged = mergeSteamSnapshots(configured, previous, fresh);
  assert.equal(merged.games.first.currentBuildId, "101");
  assert.equal(merged.games.second.currentBuildId, "200");
  assert.equal(merged.lastCheckedAt, "2026-08-30T11:00:00.000Z");
});

test("a live build change turns functional orange until that build is verified", () => {
  const config = {
    schemaVersion: 1,
    provider: {},
    games: {
      example: {
        appId: "10",
        verifiedBuildId: "100",
        currentBuildId: "100",
        lastSteamUpdate: "2026-08-20T00:00:00Z",
        manualStatus: "functional",
        override: null
      }
    }
  };
  const snapshot = {
    lastCheckedAt: "2026-08-30T12:00:00Z",
    games: {
      example: {
        appId: "10",
        currentBuildId: "101",
        lastSteamUpdate: "2026-08-30T11:45:00Z",
        checkedAt: "2026-08-30T12:00:00Z"
      }
    }
  };

  const liveGame = applySteamSnapshot(config, snapshot).games.example;
  assert.equal(liveGame.currentBuildId, "101");
  assert.equal(liveGame.lastSteamUpdate, "2026-08-30T11:45:00.000Z");
  assert.equal(resolveDisplayStatus(liveGame).key, "pending");
  assert.equal(resolveDisplayStatus({
    ...liveGame,
    statusOverride: { status: "functional", verifiedBuildId: "101" }
  }).key, "functional");
  assert.equal(resolveDisplayStatus({
    ...liveGame,
    currentBuildId: "102",
    statusOverride: { status: "functional", verifiedBuildId: "101" }
  }).key, "pending");
});

test("snapshots are considered stale after the hourly schedule grace period", () => {
  const snapshot = { lastCheckedAt: "2026-08-30T12:00:00Z" };
  assert.equal(isSteamSnapshotFresh(snapshot, Date.parse("2026-08-30T13:14:59Z")), true);
  assert.equal(isSteamSnapshotFresh(snapshot, Date.parse("2026-08-30T13:15:01Z")), false);
});

test("Netlify schedules the Steam checker hourly", () => {
  const netlifyConfig = readFileSync(new URL("netlify.toml", root), "utf8");
  assert.match(netlifyConfig, /\[functions\."steam-build-check"\]\s+schedule = "@hourly"/);
});

test("only an explicit query parameter forces a manual Steam refresh", () => {
  assert.equal(isManualRefreshRequest({ queryStringParameters: { refresh: "1" } }), true);
  assert.equal(isManualRefreshRequest({ queryStringParameters: { refresh: "true" } }), true);
  assert.equal(isManualRefreshRequest({ queryStringParameters: { refresh: "0" } }), false);
  assert.equal(isManualRefreshRequest({}), false);
});

test("the UI shows verified, latest and Steam update values from their correct fields", () => {
  const script = readFileSync(new URL("script.js", root), "utf8");
  assert.match(script, /\[data-current-build\]'\)\.textContent = verifiedBuildId/);
  assert.match(script, /\[data-latest-build\]'\)\.textContent = resolvedGame\.currentBuildId/);
  assert.match(script, /\[data-last-steam-update\]'\)\.textContent = formatStatusDate\(resolvedGame\.lastSteamUpdate\)/);
  assert.match(script, /fetch\(endpoint, \{ cache: 'no-store'/);
});
