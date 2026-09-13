import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = file => readFile(new URL(file, root), 'utf8');

test('shared Site Presence restores auth, subscribes before tracking, and uses the owner user id', async () => {
  const script = await read('script.js');

  assert.match(script, /channelName = 'site-presence'/);
  assert.match(script, /config: \{ private: true, presence: \{ enabled: true \} \}/);
  assert.match(script, /event: 'sync'/);
  assert.match(script, /event: 'join'/);
  assert.match(script, /event: 'leave'/);
  assert.match(script, /status !== 'SUBSCRIBED'/);
  assert.match(script, /db\.rpc\('is_game_status_admin'\)/);
  assert.match(script, /nextChannel\.track\(\{[\s\S]*user_id: session\.user\.id/);
  assert.match(script, /presence\?\.user_id === ownerUserId/);
  assert.match(script, /\.eq\('is_author', true\)[\s\S]*\.order\('id'/);
  assert.match(script, /sitePresence\.setOwnerUserId\(data\?\.id\)/);
  assert.match(script, /db\.auth\.getSession\(\)/);
  assert.match(script, /db\.auth\.onAuthStateChange/);
  assert.match(script, /db\.removeChannel\(previousChannel\)/);
});

test('Site Presence SQL restricts tracking to the admin', async () => {
  const sql = await read('SQL EDITOR/SUPABASE-SITE-PRESENCE.sql');

  assert.match(sql, /on realtime\.messages[\s\S]*for select[\s\S]*to anon, authenticated/i);
  assert.match(sql, /realtime\.topic\(\).*'site-presence'/i);
  assert.match(sql, /for insert[\s\S]*to authenticated[\s\S]*public\.is_game_status_admin\(\)/i);
  assert.doesNotMatch(sql, /service_role|sb_secret_/i);
});
