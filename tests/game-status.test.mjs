import test from "node:test";
import assert from "node:assert/strict";
import { buildStatusPayload, resolveDisplayStatus } from "../netlify/functions/_lib/game-status.mjs";

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

