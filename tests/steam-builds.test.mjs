import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import {
  createGameStatusHandler,
  isManualRefreshRequest,
  readManualRefreshGameSlug
} from "../netlify/functions/game-status.mjs";
import { resolveDisplayStatus } from "../netlify/functions/_lib/game-status.mjs";
import {
  applySteamSnapshot,
  fetchSteamBuildSnapshot,
  fetchSteamCmdBuildSnapshot,
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

test("manual HTTPS Steam check bypasses HTTP caches and reads only the selected game", async () => {
  let requestedUrl;
  let requestedOptions;
  const snapshot = await fetchSteamCmdBuildSnapshot({
    example: { appId: "2968420" }
  }, {
    cacheBuster: 12345,
    now: () => new Date("2026-08-30T12:00:00Z"),
    timeoutMs: 1000,
    fetchImpl: async (url, options) => {
      requestedUrl = String(url);
      requestedOptions = options;
      return {
        ok: true,
        json: async () => ({
          status: "success",
          data: {
            "2968420": {
              depots: { branches: { public: { buildid: "23737596", timeupdated: "1784209698" } } }
            }
          }
        })
      };
    }
  });

  assert.equal(requestedUrl, "https://api.steamcmd.net/v1/info/2968420?_=12345");
  assert.equal(requestedOptions.cache, "no-store");
  assert.equal(requestedOptions.headers["Cache-Control"], "no-cache");
  assert.deepEqual(Object.keys(snapshot.games), ["example"]);
  assert.equal(snapshot.games.example.currentBuildId, "23737596");
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
  assert.match(netlifyConfig, /from = "\/api\/game-status"\s+to = "\/\.netlify\/functions\/game-status"\s+status = 200/);
});

test("only a JSON POST for a concrete game starts a manual Steam refresh", () => {
  const event = {
    httpMethod: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ gameSlug: "powerwash-simulator-2" })
  };
  assert.equal(isManualRefreshRequest(event), true);
  assert.equal(readManualRefreshGameSlug(event), "powerwash-simulator-2");
  assert.equal(isManualRefreshRequest({ httpMethod: "GET", queryStringParameters: { refresh: "1" } }), false);
  assert.equal(isManualRefreshRequest({}), false);
});

test("manual refresh returns a fresh selected-game result even when Netlify Blobs is unavailable", async () => {
  const config = {
    schemaVersion: 1,
    provider: {},
    games: {
      example: {
        name: "Example",
        appId: "10",
        supportedVersion: "v1.0",
        verifiedBuildId: "100",
        currentBuildId: "100",
        lastSteamUpdate: "2026-08-20T00:00:00Z",
        manualStatus: "functional",
        override: null
      },
      untouched: {
        name: "Untouched",
        appId: "20",
        supportedVersion: "v2.0",
        verifiedBuildId: "200",
        currentBuildId: "200",
        lastSteamUpdate: "2026-08-20T00:00:00Z",
        manualStatus: "functional",
        override: null
      }
    }
  };
  let selectedGames;
  const handler = createGameStatusHandler({
    loadConfig: async () => config,
    openStore: () => { throw new Error("Blob context unavailable"); },
    fetchManualSnapshot: async games => {
      selectedGames = games;
      return {
        schemaVersion: 1,
        provider: "steamcmd-http-public-branch",
        lastCheckedAt: "2026-08-30T12:00:00Z",
        games: {
          example: {
            appId: "10",
            currentBuildId: "101",
            lastSteamUpdate: "2026-08-30T11:45:00Z",
            checkedAt: "2026-08-30T12:00:00Z"
          }
        },
        errors: {}
      };
    },
    logger: { warn() {}, error() {} }
  });

  const response = await handler({
    httpMethod: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ gameSlug: "example" })
  });
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(Object.keys(selectedGames), ["example"]);
  assert.deepEqual(payload.refresh, {
    fresh: true,
    gameSlug: "example",
    checkedAt: "2026-08-30T12:00:00Z",
    source: "steamcmd-http-public-branch"
  });
  assert.equal(payload.games.example.currentBuildId, "101");
  assert.equal(payload.games.example.displayStatus.key, "pending");
  assert.equal(payload.games.untouched.currentBuildId, "200");
});

test("manual refresh does not mark the full hourly snapshot as freshly checked", async () => {
  const config = {
    schemaVersion: 1,
    provider: {},
    games: {
      example: {
        appId: "10",
        verifiedBuildId: "100",
        currentBuildId: "100",
        manualStatus: "functional"
      }
    }
  };
  const previous = {
    schemaVersion: 1,
    provider: "steam-pics-public-branch",
    lastCheckedAt: "2026-08-30T10:00:00Z",
    games: {
      example: { appId: "10", currentBuildId: "100", checkedAt: "2026-08-30T10:00:00Z" }
    }
  };
  let savedSnapshot;
  const handler = createGameStatusHandler({
    loadConfig: async () => config,
    openStore: () => ({
      get: async () => previous,
      setJSON: async (key, value) => { savedSnapshot = value; }
    }),
    fetchManualSnapshot: async () => ({
      schemaVersion: 1,
      provider: "steamcmd-http-public-branch",
      lastCheckedAt: "2026-08-30T12:00:00Z",
      games: {
        example: { appId: "10", currentBuildId: "101", checkedAt: "2026-08-30T12:00:00Z" }
      },
      errors: {}
    }),
    logger: { warn() {}, error() {} }
  });

  const response = await handler({
    httpMethod: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ gameSlug: "example" })
  });

  assert.equal(response.statusCode, 200);
  assert.equal(savedSnapshot.lastCheckedAt, previous.lastCheckedAt);
  assert.equal(savedSnapshot.provider, previous.provider);
  assert.equal(savedSnapshot.games.example.currentBuildId, "101");
});

test("legacy GET refresh explains that the page must use the new POST mode", async () => {
  const handler = createGameStatusHandler();
  const response = await handler({
    httpMethod: "GET",
    queryStringParameters: { refresh: "1" }
  });
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 405);
  assert.equal(payload.code, "MANUAL_REFRESH_REQUIRES_POST");
  assert.match(payload.error, /Obnovte stránku/);
});

test("manual refresh exposes a useful timeout instead of a generic 500", async () => {
  const error = new Error("timed out");
  error.code = "STEAM_TIMEOUT";
  const handler = createGameStatusHandler({
    loadConfig: async () => ({ schemaVersion: 1, provider: {}, games: { example: { appId: "10" } } }),
    fetchManualSnapshot: async () => { throw error; },
    logger: { warn() {}, error() {} }
  });
  const response = await handler({
    httpMethod: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ gameSlug: "example" })
  });
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 504);
  assert.equal(payload.code, "STEAM_TIMEOUT");
  assert.match(payload.error, /Steam neodpověděl včas/);
});

test("the UI shows verified, latest and Steam update values from their correct fields", () => {
  const script = readFileSync(new URL("script.js", root), "utf8");
  assert.match(script, /\[data-current-build\]'\)\.textContent = verifiedBuildId/);
  assert.match(script, /\[data-latest-build\]'\)\.textContent = resolvedGame\.currentBuildId/);
  assert.match(script, /\[data-last-steam-update\]'\)\.textContent = formatStatusDate\(resolvedGame\.lastSteamUpdate\)/);
  assert.match(script, /fetch\(endpoint, \{ cache: 'no-store'/);
});
