import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('favorites stay separate from followed games and are available in detail, catalog and profile UI', async () => {
  const [system, css, profile, account] = await Promise.all([
    read('user-system.js'), read('user-system.css'), read('profil.html'), read('account.js')
  ]);
  assert.match(system, /from\('user_favorite_games'\)/);
  assert.match(system, /Přidat do oblíbených/);
  assert.match(system, /V oblíbených/);
  assert.match(system, /Pro přidání hry do oblíbených se musíte přihlásit\./);
  assert.match(system, /initTranslationFavoriteButtons/);
  assert.match(profile, /id="oblibene-hry"/);
  assert.match(profile, /data-profile-favorite-count/);
  assert.match(system, /Zatím nemáte žádné oblíbené hry/);
  assert.match(account, /'oblibene-hry'/);
  assert.match(css, /\.translation-favorite-button/);
  assert.match(css, /@media\(max-width:600px\)/);
  assert.doesNotMatch(system, /service_role/i);
});

test('favorite migration enforces ownership, uniqueness and least-privilege grants', async () => {
  const sql = await read('SQL EDITOR/SUPABASE-FAVORITE-GAMES.sql');
  assert.match(sql, /references auth\.users\(id\) on delete cascade/i);
  assert.match(sql, /references public\.game_versions\(game_slug\)/i);
  assert.match(sql, /unique \(user_id, game_slug\)/i);
  assert.match(sql, /alter table public\.user_favorite_games enable row level security/i);
  assert.match(sql, /for select to authenticated[\s\S]*auth\.uid\(\)[\s\S]*user_id/i);
  assert.match(sql, /for insert to authenticated[\s\S]*with check[\s\S]*auth\.uid\(\)[\s\S]*user_id/i);
  assert.match(sql, /for delete to authenticated[\s\S]*auth\.uid\(\)[\s\S]*user_id/i);
  assert.match(sql, /revoke all on table public\.user_favorite_games from public, anon, authenticated/i);
  assert.doesNotMatch(sql, /create trigger|notifications|service_role/i);
});
