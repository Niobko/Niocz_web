import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const userSystem = readFileSync(new URL('user-system.js', root), 'utf8');
const script = readFileSync(new URL('script.js', root), 'utf8');
const sql = readFileSync(new URL('SQL EDITOR/SUPABASE-ADMIN-GAME-VERSION-SAVE-FIX.sql', root), 'utf8');

test('admin save reads the exact row back and rejects missing or stale data', () => {
  assert.match(userSystem, /rpc\('admin_update_game_version', args\)/);
  assert.match(userSystem, /\.eq\('game_slug', args\.requested_game_slug\)[\s\S]*\.maybeSingle\(\)/);
  assert.match(userSystem, /if \(!persisted\) throw new Error/);
  assert.match(userSystem, /Object\.entries\(expected\)\.find/);
  assert.match(userSystem, /NIO_REFRESH_GAME_STATUSES/);
  assert.match(userSystem, /finally \{[\s\S]*submit\.disabled = false/);
});

test('public pages hydrate version and date content from game_versions', () => {
  assert.match(script, /supported_game_version,name,translation_version,translation_updated_at/);
  assert.match(script, /translationVersion: normalizeComparableValue\(saved\.translation_version\)/);
  assert.match(script, /translationUpdatedAt: saved\.translation_updated_at/);
  assert.match(script, /applyGameVersionContent\(games\)/);
  assert.match(script, /closest\('\.translation-card'\)/);
  assert.match(script, /closest\('\.latest-game-card'\)/);
  assert.match(script, /latestSummary\.textContent[\s\S]*game\.translationVersion/);
  assert.match(script, /document\.body\.dataset\.game/);
});

test('SQL update uses the canonical slug, verifies existence and remains notification-safe', () => {
  assert.match(sql, /normalized_slug text := lower\(btrim\(requested_game_slug\)\)/i);
  assert.match(sql, /if not exists \(select 1 from public\.game_versions where game_slug = normalized_slug\)/i);
  assert.match(sql, /where game_slug = normalized_slug[\s\S]*is distinct from/i);
  assert.match(sql, /returning \* into saved/i);
  assert.match(sql, /private\.is_admin\(\)/i);
  assert.doesNotMatch(sql, /insert into public\.game_versions/i);
});
