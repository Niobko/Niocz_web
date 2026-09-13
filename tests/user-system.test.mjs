import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('profile exposes every requested community section', async () => {
  const [html, account] = await Promise.all([read('profil.html'), read('account.js')]);
  for (const id of ['prehled', 'sledovane-hry', 'upozorneni', 'odznaky', 'aktivita', 'komentare', 'hlasovani', 'administrace']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /data-profile-selected-badge/);
  assert.match(html, /data-badge-admin/);
  for (const panel of ['news', 'games', 'badges', 'activity']) {
    assert.match(html, new RegExp(`data-dashboard-${panel}`));
  }
  assert.match(account, /section\.hidden = section\.dataset\.accountSection !== active/);
  assert.match(account, /overview\.hidden = active !== 'prehled'/);
});

test('admin tools have one protected profile section', async () => {
  const [html, account, system] = await Promise.all([read('profil.html'), read('account.js'), read('user-system.js')]);
  assert.match(html, /data-account-tab="administrace" data-admin-nav hidden/);
  assert.match(html, /data-account-section="administrace" data-admin-section hidden/);
  const adminStart = html.indexOf('data-account-section="administrace"');
  assert.ok(adminStart > 0);
  assert.ok(html.indexOf('data-badge-admin', adminStart) > adminStart);
  assert.ok(html.indexOf('data-admin-request-list', adminStart) > adminStart);
  assert.match(account, /hash !== 'administrace' \|\| adminAvailable/);
  assert.match(system, /rpc\('is_game_status_admin'\)/);
  assert.match(system, /adminNav\.hidden = !isAdmin/);
  assert.match(system, /window\.location\.hash === '#administrace'/);
});

test('all exact badge assets are present and never CSS-filtered', async () => {
  const css = await read('user-system.css');
  assert.doesNotMatch(css, /badge[^,{]*img[^,{]*\{[^}]*\bfilter\s*:/i);
  for (const name of ['komentator', 'diskuter', 'lovec-chyb', 'tester', 'hlasujici', 'sberatel', 'veteran', 'podporovatel']) {
    const info = await stat(new URL(`../assets/badges/${name}.png`, import.meta.url));
    assert.ok(info.size > 0, `${name}.png must not be empty`);
  }
});

test('follow and notification UI reuse the shared Supabase client', async () => {
  const [main, system, css] = await Promise.all([read('script.js'), read('user-system.js'), read('user-system.css')]);
  assert.match(main, /window\.NIO_SUPABASE_CLIENT = db/);
  assert.match(system, /const db = window\.NIO_SUPABASE_CLIENT/);
  assert.match(system, /user_followed_games/);
  assert.match(system, /notifications/);
  assert.match(system, /user_id=eq\.\$\{currentUser\.id\}/);
  assert.match(system, /source\.replace\(\/\^\\\/\+\//);
  assert.match(system, /document\.querySelector\('\.detail-grid > \.download-card'\)/);
  assert.match(system, /details\.before\(wrapper\)/);
  assert.match(system, /renderDashboardGames\(followed\)/);
  assert.match(system, /renderDashboardBadges\(badgeRows\)/);
  assert.match(system, /renderDashboardActivity\(activityData\?\.activities/);
  assert.match(css, /follow-game-button svg\{[^}]*fill:transparent[^}]*stroke:#7fb8e8/);
  assert.match(css, /follow-game-button\.is-following svg\{[^}]*fill:#7fb8e8/);
  assert.doesNotMatch(system, /service_role/i);
});

test('migration protects ownership, badge assignment and version events', async () => {
  const sql = await read('SQL EDITOR/SUPABASE-USER-SYSTEM.sql');
  for (const table of ['user_followed_games', 'notifications', 'badges', 'user_badges']) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
  }
  assert.match(sql, /unique \(user_id, game_slug\)/i);
  assert.match(sql, /unique \(user_id, badge_id\)/i);
  assert.match(sql, /revoke all on table public\.user_badges from public, anon, authenticated/i);
  assert.match(sql, /grant select on table public\.user_badges to authenticated/i);
  assert.match(sql, /new\.translation_version is distinct from old\.translation_version/i);
  assert.match(sql, /new\.supported_game_version is distinct from old\.supported_game_version/i);
  assert.match(sql, /private\.is_admin\(\)/i);
  assert.match(sql, /set search_path = ''/i);
});

test('automatic badges use authoritative activity and manual badges stay admin-only', async () => {
  const sql = await read('SQL EDITOR/SUPABASE-USER-SYSTEM.sql');
  assert.match(sql, /from public\.comments where user_id = requested_user_id/i);
  assert.match(sql, /from public\.translation_votes where user_id = requested_user_id/i);
  assert.match(sql, /from public\.bug_reports[\s\S]*is_confirmed or status in/i);
  assert.match(sql, /'tester'[\s\S]*false/i);
  assert.match(sql, /'podporovatel'[\s\S]*false/i);
  assert.match(sql, /admin_set_user_badge/i);
  assert.match(sql, /admin_set_bug_report_confirmed/i);
});

test('admin can manage Steam configuration while live Steam metadata stays automatic', async () => {
  const [html, system, sql, endpoint, schedule] = await Promise.all([
    read('profil.html'), read('user-system.js'), read('SQL EDITOR/SUPABASE-ADMIN-GAME-CONFIG.sql'),
    read('netlify/functions/game-status.mjs'), read('netlify/functions/steam-build-check.mjs')
  ]);
  for (const field of ['steam-app-id', 'verified-build-id', 'latest-build', 'last-steam-update']) {
    assert.match(html, new RegExp(`data-admin-${field}`));
  }
  assert.match(html, /data-admin-latest-build readonly/);
  assert.match(html, /data-admin-last-steam-update readonly/);
  assert.match(system, /requested_steam_app_id/);
  assert.match(system, /requested_verified_build_id/);
  assert.match(sql, /if not private\.is_admin\(\)/i);
  assert.match(sql, /set search_path = ''/i);
  assert.match(sql, /steam_app_id text/i);
  assert.match(sql, /verified_build_id text/i);
  assert.match(sql, /revoke all on function public\.admin_update_game_version/i);
  assert.match(endpoint, /loadGameStatusConfig/);
  assert.match(schedule, /loadGameStatusConfig/);
  assert.doesNotMatch([system, sql, endpoint, schedule].join('\n'), /service_role/i);
});
