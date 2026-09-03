import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const script = readFileSync(new URL("script.js", root), "utf8");
const styles = readFileSync(new URL("style.css", root), "utf8");
const sql = readFileSync(new URL("SQL EDITOR/SUPABASE-GAME-STATUS-ADMIN.sql", root), "utf8");
const statusConfig = JSON.parse(readFileSync(new URL("data/game-status.json", root), "utf8"));

test("frontend combines public overrides with every configured game", () => {
  assert.match(script, /from\('game_status_overrides'\)/);
  assert.match(script, /mergeGameStatusOverrides/);
  assert.match(script, /statusOverride: overrides\?\.\[slug\] \|\| null/);
  assert.match(script, /applyGameStatuses\(activeGameStatuses\)/);
  assert.ok(Object.keys(statusConfig.games).length >= 13);
});

test("only a verified admin receives the status editor", () => {
  assert.match(script, /rpc\('is_game_status_admin'\)/);
  assert.match(script, /adminStatusEditor\.hidden = !canManageGameStatuses/);
  assert.match(script, /data-admin-game-status/);
  assert.match(styles, /\.game-status-admin-editor\[hidden\]\{display:none\}/);
});

test("saving functional status sends the current build through the protected RPC", () => {
  assert.match(script, /rpc\('set_game_status_override'/);
  assert.match(script, /requested_current_build: normalizeComparableValue\(game\.currentBuildId\)/);
  assert.match(script, /setGameStatusAdminMessage\('Stav byl uložen\.'\)/);
});

test("SQL protects writes with RLS, grants and a server-side admin check", () => {
  assert.match(sql, /add column if not exists is_admin boolean/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on table public\.game_status_overrides from public, anon, authenticated/i);
  assert.match(sql, /grant select on table public\.game_status_overrides to anon, authenticated/i);
  assert.match(sql, /security definer[\s\S]*profile\.is_admin = true/i);
  assert.match(sql, /grant execute on function public\.set_game_status_override\(text, text, text, text\) to authenticated/i);
  assert.doesNotMatch(sql, /grant (insert|update|delete).*game_status_overrides.*authenticated/i);
});

test("SQL blocks self-promotion even if an older profiles update policy is broad", () => {
  assert.match(sql, /guard_profile_admin_role/i);
  assert.match(sql, /auth\.role\(\).*'authenticated'/i);
  assert.match(sql, /new\.is_admin is distinct from old\.is_admin/i);
});
