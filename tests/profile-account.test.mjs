import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = file => readFile(new URL(file, root), 'utf8');

test('authenticated header uses an account menu instead of direct logout', async () => {
  const [script, css] = await Promise.all([read('script.js'), read('community.css')]);
  assert.match(script, /data-account-trigger/);
  assert.match(script, /header-utility-group/);
  assert.match(script, /utilityGroup\.append\(voteLink\)/);
  assert.match(script, /utilityGroup\.append\(bugLink\)/);
  assert.match(script, /utilityGroup\.append\(authButton\)/);
  assert.match(script, /utilityGroup\.append\(account\)/);
  assert.match(css, /\.header-utility-group\{display:flex/);
  assert.match(script, /href="profil\.html"/);
  assert.match(script, /data-account-signout/);
  assert.doesNotMatch(script, /button\.textContent = user \? 'Odhlásit se'/);
});

test('header keeps support and utility controls together in the requested order', async () => {
  const [script, css, bugReports] = await Promise.all([read('script.js'), read('community.css'), read('bug-reports.html')]);
  assert.match(script, /href = 'https:\/\/ko-fi\.com\/nioczloc'/);
  assert.match(script, /<span>Podpořit projekt<\/span>/);
  assert.match(script, /const supportLink[\s\S]*utilityGroup\.append\(supportLink\)[\s\S]*utilityGroup\.append\(voteLink\)[\s\S]*utilityGroup\.append\(bugLink\)[\s\S]*utilityGroup\.append\(authButton\)/);
  assert.match(script, /bugLink\.before\(link\)/);
  assert.match(css, /\.nav-support svg\{/);
  assert.match(css, /\.site-header \.nav-wrap\{padding-right:clamp/);
  assert.match(bugReports, /data-header/);
  assert.match(bugReports, /data-menu-toggle/);
  assert.match(bugReports, /data-menu/);
});

test('profile page provides profile, security and responsive settings sections', async () => {
  const [html, js, css] = await Promise.all([read('profil.html'), read('account.js'), read('account.css')]);
  assert.match(html, /data-profile-form/);
  assert.match(html, /data-password-form/);
  assert.match(html, /data-reset-password/);
  assert.match(html, /data-crop-canvas/);
  assert.match(html, /data-crop-zoom/);
  assert.match(html, /Použít výřez/);
  assert.match(js, /auth\.updateUser\(\{ password \}\)/);
  assert.match(js, /storage\.from\('avatars'\)\.upload/);
  assert.match(js, /cropCanvas\.toBlob/);
  assert.match(js, /new File\(\[blob\], 'avatar-cropped\.webp'/);
  assert.match(css, /\.avatar-crop-mask/);
  assert.match(css, /touch-action:none/);
  assert.match(css, /@media\(max-width:360px\)/);
});

test('profile migration restricts profile and avatar writes to their owner', async () => {
  const sql = await read('SQL EDITOR/SUPABASE-USER-PROFILES.sql');
  assert.match(sql, /auth\.uid\(\)\) = id/);
  assert.match(sql, /owner_id = \(select auth\.uid\(\)::text\)/);
  assert.match(sql, /file_size_limit/);
  assert.doesNotMatch(sql, /service_role/i);
});
