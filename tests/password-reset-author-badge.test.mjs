import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = file => readFile(new URL(file, root), 'utf8');

test('login offers a non-enumerating Supabase password reset flow', async () => {
  const [script, resetHtml, resetScript] = await Promise.all([
    read('script.js'),
    read('reset-hesla.html'),
    read('reset-password.js')
  ]);
  assert.match(script, /Zapomněli jste heslo\?/);
  assert.match(script, /auth\.resetPasswordForEmail\(email\.value\.trim\(\), \{ redirectTo \}\)/);
  assert.match(script, /Pokud účet s tímto e-mailem existuje/);
  assert.match(script, /new URL\('reset-hesla\.html', document\.baseURI\)\.href/);
  assert.match(resetHtml, /data-new-password/);
  assert.match(resetHtml, /data-confirm-password/);
  assert.match(resetScript, /event === 'PASSWORD_RECOVERY'/);
  assert.match(resetScript, /hasRecoveryLink/);
  assert.match(resetScript, /auth\.updateUser\(\{ password \}\)/);
  assert.match(resetScript, /password !== confirmation/);
  assert.match(resetScript, /minimumPasswordLength = 8/);
});

test('every game detail receives the shared translation author badge', async () => {
  const [script, styles] = await Promise.all([read('script.js'), read('style.css')]);
  assert.match(script, /data-translation-author/);
  assert.match(script, /Překlad vytvořil/);
  assert.match(script, /\.eq\('is_author', true\)/);
  assert.match(script, /select\('id,display_name,avatar_url'\)/);
  assert.match(script, /heroSide\.append\(rating\)/);
  assert.match(styles, /\.translation-author-badge/);
  assert.match(styles, /data-author-presence="online"/);
  assert.match(script, /Online stav autora není dostupný/);
});

test('translation author badge opens an accessible modal with game-specific update data', async () => {
  const [script, styles] = await Promise.all([read('script.js'), read('style.css')]);
  assert.match(script, /aria-haspopup="dialog"/);
  assert.match(script, /Informace o překladu/);
  assert.match(script, /data-translation-author-updated/);
  assert.match(script, /downloadCard\.querySelectorAll\('dt'\)/);
  assert.match(script, /updatedSource\.textContent\.trim\(\)/);
  assert.match(script, /data-translation-author-description-name/);
  assert.match(script, /data-translation-author-close/);
  assert.match(script, /event\.key === 'Escape'/);
  assert.match(script, /authorReturnFocus\?\.focus\(\)/);
  assert.match(styles, /\.translation-author-modal/);
  assert.match(styles, /\.translation-author-role\{[^}]*border:1px solid #ffd84d/);
  assert.match(styles, /max-height:calc\(100dvh - 40px\)/);
});
