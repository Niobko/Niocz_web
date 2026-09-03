import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const root = new URL("../", import.meta.url);
const statusConfig = JSON.parse(readFileSync(new URL("data/game-status.json", root), "utf8"));
const script = readFileSync(new URL("script.js", root), "utf8");
const styles = readFileSync(new URL("style.css", root), "utf8");
const bugReports = readFileSync(new URL("bug-reports.html", root), "utf8");
const ratingsSql = readFileSync(new URL("SQL EDITOR/SUPABASE-GAME-RATINGS.sql", root), "utf8");
const index = readFileSync(new URL("index.html", root), "utf8");

const detailPages = readdirSync(root)
  .filter(file => file.endsWith(".html"))
  .map(file => ({ file, html: readFileSync(new URL(file, root), "utf8") }))
  .filter(page => page.html.includes("data-comments-list"));

test("all current game details receive the shared report, rating and version tools", () => {
  const detailSlugs = detailPages
    .map(({ html }) => html.match(/<body[^>]*data-game="([^"]+)"/)?.[1])
    .sort();
  assert.deepEqual(detailSlugs, Object.keys(statusConfig.games).sort());
  assert.match(script, /bug-reports\.html\?game=\$\{encodeURIComponent\(gameSlug\)\}/);
  assert.match(script, /className = 'game-rating-card'/);
  assert.match(script, /className = 'version-status-panel'/);
  assert.match(script, /data-version-refresh/);
  assert.match(script, /loadGameStatuses\(\{ forceSteamRefresh: true, gameSlug \}\)/);
  assert.match(script, /method: 'POST'/);
  assert.match(script, /JSON\.stringify\(\{ gameSlug: requestedGameSlug \}\)/);
  assert.match(script, /payload\?\.refresh\?\.fresh !== true/);
  assert.match(script, /refreshButton\.disabled = busy/);
  assert.match(styles, /version-status-refresh\[aria-busy="true"\] svg/);
  assert.match(script, /versionBox\.replaceWith\(heroSide\)/);
  assert.match(script, /heroSide\.append\(rating\)/);
  assert.match(script, /statusPanel\.hidden = true/);
  assert.match(script, /statusControl\.append\(statusPanel\)/);
  assert.match(script, /heroSide\.append\(statusControl\)/);
  assert.match(script, /aria-expanded/);
  assert.match(script, /applyGameStatuses\(fallbackGameStatuses\)/);
  for (const game of Object.values(statusConfig.games)) {
    assert.ok(game.supportedVersion, `${game.name} must define supportedVersion`);
  }
});

test("bug report query parameter preselects a registered game", () => {
  assert.match(bugReports, /new URLSearchParams\(window\.location\.search\)/);
  assert.match(bugReports, /gameSelect\.value = requestedGameSlug/);
  assert.match(bugReports, /gamesBySlug\[requestedGameSlug\]/);
  assert.match(bugReports, /openReportForm\(\{ scroll: true \}\)/);
  assert.doesNotMatch(bugReports, /form\.style\.display = "none"/);
});

test("ratings require one authenticated vote per game and expose only aggregate public data", () => {
  assert.match(ratingsSql, /primary key \(game_slug, user_id\)/i);
  assert.match(ratingsSql, /enable row level security/i);
  assert.match(ratingsSql, /auth\.uid\(\).*user_id/i);
  assert.match(ratingsSql, /get_game_rating_summary/i);
  assert.match(ratingsSql, /revoke all on table public\.game_ratings from anon/i);
  for (const slug of Object.keys(statusConfig.games)) assert.match(ratingsSql, new RegExp(`'${slug}'`));
});

test("download sidebar is static and existing download hooks remain in every detail", () => {
  assert.match(styles, /\.detail-grid>\.download-card\{position:static;top:auto\}/);
  for (const { file, html } of detailPages) {
    assert.match(html, /data-download/, `${file} must retain its download hook`);
    assert.match(html, /data-download-count/, `${file} must retain its download counter`);
    assert.match(html, /data-comments-list/, `${file} must retain comments`);
  }
});

test("homepage translation badges use Čeština without changing prose", () => {
  assert.doesNotMatch(index, /<div class="latest-game-body"><p>Český překlad ·/i);
  assert.equal([...index.matchAll(/<div class="latest-game-body"><p>Čeština ·/g)].length, detailPages.length);
});
