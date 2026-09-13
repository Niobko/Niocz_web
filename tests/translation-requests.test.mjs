import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = name => readFile(new URL(name, root), 'utf8');

test('homepage removes only the placeholder progress block and exposes top requests', async () => {
  const html = await read('index.html');
  assert.doesNotMatch(html, /Na čem právě pracuji|Název hry bude doplněn|Výhled překladů/i);
  assert.match(html, /<h2 id="vote-preview-title">Žádosti o překlad<\/h2>/);
  assert.match(html, /data-request-open>Navrhnout hru/);
  assert.match(html, /Zobrazit všechny žádosti/);
  assert.match(html, /data-vote-preview/);
  assert.match(html, /id="o-projektu"/);
  assert.match(html, /id="kontakt"/);
});

test('full request page contains all required filters and shared list', async () => {
  const html = await read('hlasovani.html');
  for (const label of ['Nejvíce hlasů', 'Nejnovější', 'Plánované', 'Dokončené']) {
    assert.match(html, new RegExp(label));
  }
  assert.match(html, /data-request-open>Navrhnout hru/);
  assert.match(html, /data-vote-list/);
});

test('request client uses RPC submission, computed list and vote toggle', async () => {
  const js = await read('translation-requests.js');
  assert.match(js, /rpc\('get_translation_requests'\)/);
  assert.match(js, /rpc\('create_translation_request'/);
  assert.match(js, /Pro vytvoření návrhu se musíte přihlásit\./);
  assert.match(js, /Tato hra už byla navržena\. Můžete ji místo toho podpořit\./);
  assert.match(js, /from\('translation_votes'\)\.insert/);
  assert.match(js, /from\('translation_votes'\)\.delete/);
  assert.match(js, /from\('translation_requests'\)\.update/);
  assert.match(js, /from\('translation_requests'\)\.delete/);
  assert.match(js, /data-admin-request-list/);
  assert.match(js, /Administrace je dostupná pouze administrátorovi\./);
  assert.match(js, /Upravit nebo odstranit/);
});

test('migration locks down requests and votes with constraints, policies and grants', async () => {
  const sql = await read('SQL EDITOR/SUPABASE-TRANSLATION-REQUESTS.sql');
  assert.match(sql, /unique \(request_id, user_id\)/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on table public\.translation_requests from public, anon, authenticated/i);
  assert.match(sql, /grant select \(id, game_name, game_url, note, status, created_at\)[\s\S]*on table public\.translation_requests to anon, authenticated/i);
  assert.match(sql, /grant insert \(request_id, user_id\) on table public\.translation_votes to authenticated/i);
  assert.match(sql, /using \(\(select auth\.uid\(\)\) = user_id\)/i);
  assert.match(sql, /private\.is_admin\(\)/i);
  assert.match(sql, /security definer\s+set search_path = ''/i);
  assert.match(sql, /revoke all on function public\.create_translation_request/i);
  assert.match(sql, /pg_advisory_xact_lock/i);
  assert.match(sql, /normalized_game_name/i);
  assert.match(sql, /count\(vote\.request_id\)::bigint as vote_count/i);
  assert.doesNotMatch(sql, /vote\.id/i);
  assert.match(sql, /drop constraint if exists translation_requests_cover_url_check/i);
  assert.match(sql, /drop constraint if exists translation_requests_description_check/i);
});

test('cover hotfix removes the obsolete legacy constraint', async () => {
  const sql = await read('SQL EDITOR/SUPABASE-TRANSLATION-REQUESTS-COVER-HOTFIX.sql');
  assert.match(sql, /alter table public\.translation_requests/i);
  assert.match(sql, /drop constraint if exists translation_requests_cover_url_check/i);
  assert.match(sql, /drop constraint if exists translation_requests_description_check/i);
});

test('all six stable status values have Czech labels', async () => {
  const js = await read('translation-requests.js');
  for (const pair of [
    ['pending', 'Nový návrh'], ['considering', 'Zvažuje se'],
    ['planned', 'Plánovaný překlad'], ['translating', 'Překládá se'],
    ['completed', 'Hotovo'], ['rejected', 'Zamítnuto']
  ]) {
    assert.match(js, new RegExp(`${pair[0]}: '${pair[1]}'`));
  }
});
