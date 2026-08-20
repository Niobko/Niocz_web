import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildStatusPayload, resolveDisplayStatus } from "../netlify/functions/_lib/game-status.mjs";

const statusConfig = JSON.parse(readFileSync(new URL("../data/game-status.json", import.meta.url), "utf8"));

test("a changed build waits for verification", () => {
  assert.equal(resolveDisplayStatus({
    verifiedBuildId: "100",
    currentBuildId: "101",
    manualStatus: "functional",
    override: null
  }).key, "pending");
});

test("manual broken status is red", () => {
  assert.deepEqual(resolveDisplayStatus({ manualStatus: "broken", override: null }), {
    key: "broken",
    label: "Nefunkční / vyžaduje update",
    color: "red"
  });
});

test("override has priority", () => {
  assert.equal(resolveDisplayStatus({
    verifiedBuildId: "100",
    currentBuildId: "101",
    manualStatus: "functional",
    override: "functional"
  }).key, "functional");
});

test("missing build IDs preserve the safe manual state", () => {
  const payload = buildStatusPayload({
    schemaVersion: 1,
    provider: { automatic: false },
    games: {
      example: { appId: 123, verifiedBuildId: null, currentBuildId: null, manualStatus: "functional", override: null }
    }
  });
  assert.equal(payload.games.example.appId, "123");
  assert.equal(payload.games.example.displayStatus.key, "functional");
});

test("Streamer Life Simulator 2 waits for verification after a detected build change", () => {
  const game = statusConfig.games["streamer-life-simulator-2"];
  assert.equal(resolveDisplayStatus(game).key, "functional");
  assert.equal(resolveDisplayStatus({ ...game, currentBuildId: "21799184" }).key, "pending");
});

test("The Universim waits for verification after a detected build change", () => {
  const game = statusConfig.games["the-universim"];
  assert.equal(resolveDisplayStatus(game).key, "functional");
  assert.equal(resolveDisplayStatus({ ...game, currentBuildId: "16850857" }).key, "pending");
});

