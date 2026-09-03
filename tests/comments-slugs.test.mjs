import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const root = new URL("../", import.meta.url);
const statusConfig = JSON.parse(readFileSync(new URL("data/game-status.json", root), "utf8"));
const script = readFileSync(new URL("script.js", root), "utf8");
const sql = readFileSync(new URL("SQL EDITOR/SUPABASE-COMMENTS-SLUGS.sql", root), "utf8");

const detailPages = readdirSync(root)
  .filter(file => file.endsWith(".html"))
  .map(file => ({ file, html: readFileSync(new URL(file, root), "utf8") }))
  .filter(page => page.html.includes("data-comments-list"));

const matchAllValues = (html, pattern) => [...html.matchAll(pattern)]
  .map(match => match.slice(1).find(Boolean));

test("every comments page uses one explicit, consistent game slug", () => {
  for (const { file, html } of detailPages) {
    const bodySlug = html.match(/<body[^>]*\bdata-game="([^"]+)"[^>]*>/)?.[1];
    assert.ok(bodySlug, `${file} must declare <body data-game>`);

    const downloadSlugs = matchAllValues(html, /\bdata-download\b[^>]*\bdata-game="([^"]+)"|\bdata-game="([^"]+)"[^>]*\bdata-download\b/g)
      .filter(Boolean);
    const statusSlugs = matchAllValues(html, /\bdata-game-status="([^"]+)"/g);

    assert.deepEqual([...new Set(downloadSlugs)], [bodySlug], `${file} download slug must match its body slug`);
    assert.deepEqual([...new Set(statusSlugs)], [bodySlug], `${file} status slug must match its body slug`);
  }
});

test("comments pages, status data and Supabase whitelist contain the same slugs", () => {
  const pageSlugs = detailPages
    .map(({ html }) => html.match(/<body[^>]*\bdata-game="([^"]+)"[^>]*>/)?.[1])
    .sort();
  const configuredSlugs = Object.keys(statusConfig.games).sort();

  assert.deepEqual(pageSlugs, configuredSlugs);
  for (const slug of pageSlugs) {
    assert.match(sql, new RegExp(`'${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'`));
  }
});

test("translation listings use the same current game slugs", () => {
  const configuredSlugs = Object.keys(statusConfig.games).sort();

  for (const file of ["index.html", "preklady.html"]) {
    const html = readFileSync(new URL(file, root), "utf8");
    const listedSlugs = [...new Set(matchAllValues(html, /\bdata-game-status="([^"]+)"/g))].sort();
    assert.deepEqual(listedSlugs, configuredSlugs, `${file} must list every current game slug exactly`);
  }
});

test("script does not silently assign Leafy Corner to pages without a slug", () => {
  assert.match(script, /const gameSlug = document\.body\.dataset\.game\?\.trim\(\) \|\| '';/);
  assert.doesNotMatch(script, /dataset\.game \|\| ['"]leafy-corner['"]/);
});
