import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const statusConfig = JSON.parse(readFileSync(new URL("data/game-status.json", root), "utf8"));
const bugReportsPage = readFileSync(new URL("bug-reports.html", root), "utf8");
const sharedScript = readFileSync(new URL("script.js", root), "utf8");

test("bug report games come from the shared game status registry", () => {
  assert.match(sharedScript, /window\.NIO_GAME_STATUSES_READY\s*=\s*loadGameStatuses\(\)/);
  assert.match(bugReportsPage, /window\.NIO_GAME_STATUSES_READY/);
  assert.match(bugReportsPage, /Object\.entries\(gamesBySlug\)/);
  assert.doesNotMatch(bugReportsPage, /<option\s+value="leafy-corner"/);
});

test("every registered game has the name and slug required by the dropdown", () => {
  const games = Object.entries(statusConfig.games);

  assert.ok(games.length > 1);
  for (const [slug, game] of games) {
    assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(typeof game.name, "string");
    assert.ok(game.name.trim(), `${slug} must have a display name`);
  }
});

test("bug report submit validates a selected registered slug", () => {
  assert.match(bugReportsPage, /if \(!gamesBySlug\[gameSlug\]\)/);
  assert.match(bugReportsPage, /form\.checkValidity\(\)/);
});

test("bug reports reuse the shared Supabase client", () => {
  assert.match(sharedScript, /window\.NIO_SUPABASE_CLIENT\s*=\s*db/);
  assert.match(bugReportsPage, /window\.NIO_SUPABASE_CLIENT/);
  assert.equal([...bugReportsPage.matchAll(/@supabase\/supabase-js@2/g)].length, 1);
});
