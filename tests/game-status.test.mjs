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

test("a detected build without a verified baseline waits for verification", () => {
  assert.equal(resolveDisplayStatus({
    verifiedBuildId: null,
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

test("a Supabase functional override is valid only for its verified build", () => {
  const verifiedGame = {
    verifiedBuildId: "100",
    currentBuildId: "101",
    manualStatus: "functional",
    statusOverride: { status: "functional", verifiedBuildId: "101" }
  };
  assert.equal(resolveDisplayStatus(verifiedGame).key, "functional");
  assert.equal(resolveDisplayStatus({ ...verifiedGame, currentBuildId: "102" }).key, "pending");
});

test("Supabase pending and broken overrides remain explicit", () => {
  const game = { verifiedBuildId: "100", currentBuildId: "100", manualStatus: "functional" };
  assert.equal(resolveDisplayStatus({ ...game, statusOverride: { status: "pending" } }).key, "pending");
  assert.equal(resolveDisplayStatus({ ...game, statusOverride: { status: "broken" } }).key, "broken");
});

test("a functional override keeps the safe fallback when no build is available", () => {
  assert.equal(resolveDisplayStatus({
    verifiedBuildId: null,
    currentBuildId: null,
    manualStatus: "broken",
    statusOverride: { status: "functional", verifiedBuildId: null }
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

test("Youtubers Life 2 waits for verification after a detected build change", () => {
  const game = statusConfig.games["youtubers-life-2"];
  assert.equal(resolveDisplayStatus(game).key, "functional");
  assert.equal(resolveDisplayStatus({ ...game, currentBuildId: "20266716" }).key, "pending");
});

test("CatMailCo waits for verification because Steam has a newer build", () => {
  const game = statusConfig.games.catmailco;
  assert.equal(game.verifiedBuildId, "24261759");
  assert.equal(game.currentBuildId, "24865609");
  assert.equal(resolveDisplayStatus(game).key, "pending");
});

test("every build changed by the live Steam check waits for verification", () => {
  const changedBuilds = {
    "hearth-and-hamlet": "25004659",
    "e-shop-tycoon": "24971980",
    restory: "24885009",
    "bookshop-simulator": "24788751",
    catmailco: "24865609"
  };

  for (const [slug, currentBuildId] of Object.entries(changedBuilds)) {
    const game = statusConfig.games[slug];
    assert.equal(game.currentBuildId, currentBuildId);
    assert.notEqual(game.verifiedBuildId, game.currentBuildId);
    assert.equal(resolveDisplayStatus(game).key, "pending");
  }
});

test("every published game has complete Steam status data", () => {
  assert.equal(Object.keys(statusConfig.games).length, 19);
  for (const [slug, game] of Object.entries(statusConfig.games)) {
    assert.match(game.appId, /^\d+$/, `${slug} is missing a Steam App ID`);
    assert.match(game.verifiedBuildId, /^\d+$/, `${slug} is missing the verified build`);
    assert.match(game.currentBuildId, /^\d+$/, `${slug} is missing the public build`);
    assert.match(game.lastSteamUpdate, /^\d{4}-\d{2}-\d{2}T/, `${slug} is missing the Steam update date`);
  }
});

test("Parcel Simulator is connected to the pending compatibility state", () => {
  const game = statusConfig.games["parcel-simulator"];
  assert.equal(game.appId, "2424010");
  assert.equal(game.supportedVersion, "v2.0.1.3");
  assert.equal(game.verifiedBuildId, "24535906");
  assert.equal(game.currentBuildId, "24535906");
  assert.equal(resolveDisplayStatus(game).key, "functional");
  assert.equal(resolveDisplayStatus({ ...game, currentBuildId: "24535907" }).key, "pending");
});

test("Alchemy Factory is connected to the pending compatibility state", () => {
  const game = statusConfig.games["alchemy-factory"];
  assert.equal(game.appId, "3669570");
  assert.equal(game.supportedVersion, "v0.5.4539");
  assert.equal(resolveDisplayStatus(game).key, "functional");
  assert.equal(resolveDisplayStatus({ ...game, currentBuildId: "23962167" }).key, "pending");
});

test("CloverPit is connected to the pending compatibility state", () => {
  const game = statusConfig.games.cloverpit;
  assert.equal(game.appId, "3314790");
  assert.equal(resolveDisplayStatus(game).key, "functional");
  assert.equal(resolveDisplayStatus({ ...game, currentBuildId: "101" }).key, "pending");
});

test("Timberborn is connected to the pending compatibility state", () => {
  const game = statusConfig.games.timberborn;
  assert.equal(game.appId, "1062090");
  assert.equal(resolveDisplayStatus(game).key, "functional");
  assert.equal(resolveDisplayStatus({ ...game, currentBuildId: "101" }).key, "pending");
});

test("Yet Another Zombie Survivors is connected to the pending compatibility state", () => {
  const game = statusConfig.games["yet-another-zombie-survivors"];
  assert.equal(game.appId, "2163330");
  assert.equal(game.supportedVersion, "v1.0.0c2_S");
  assert.equal(game.verifiedBuildId, "24969189");
  assert.equal(game.currentBuildId, "24969189");
  assert.equal(resolveDisplayStatus(game).key, "functional");
  assert.equal(resolveDisplayStatus({ ...game, currentBuildId: "101" }).key, "pending");
});

test("Warhounds is connected to the pending compatibility state", () => {
  const game = statusConfig.games.warhounds;
  assert.equal(game.appId, "3929470");
  assert.equal(game.supportedVersion, "v1.0.1");
  assert.equal(game.verifiedBuildId, "24907599");
  assert.equal(game.currentBuildId, "24907599");
  assert.equal(resolveDisplayStatus(game).key, "functional");
  assert.equal(resolveDisplayStatus({ ...game, currentBuildId: "24907600" }).key, "pending");
});

