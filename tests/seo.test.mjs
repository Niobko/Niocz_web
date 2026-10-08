import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = file => readFileSync(new URL(file, root), 'utf8');
const decode = value => value.replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1], decode(m[2])]));
const pages = readdirSync(root).filter(f => f.endsWith('.html')).map(file => ({file, html:read(file)}));
const games = pages.filter(p => /<body\b[^>]*data-game=/.test(p.html));
const sitemap = read('sitemap.xml');
const locs = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
const metas = html => [...html.matchAll(/<meta\b[^>]*>/g)].map(m => attrs(m[0]));
const meta = (html,key) => metas(html).filter(a => a.name === key || a.property === key).map(a=>a.content);
const canonicals = html => [...html.matchAll(/<link\b[^>]*>/g)].map(m=>attrs(m[0])).filter(a=>a.rel==='canonical').map(a=>a.href);

test('every registered game has exactly one static detail and crawlable catalog links', () => {
  const expected = Object.keys(JSON.parse(read('data/game-status.json')).games).sort();
  const actual = games.map(g=>attrs(g.html.match(/<body\b[^>]*>/)[0])['data-game']).sort();
  assert.deepEqual(actual, expected);
  for (const {file} of games) for (const catalog of ['preklady.html','index.html']) {
    const links = [...read(catalog).matchAll(/<a\b[^>]*>/g)].map(m=>attrs(m[0])).filter(a=>a.href?.split('#')[0]===file);
    assert.ok(links.length > 0, `${catalog}: missing ${file}`);
    for (const a of links) assert.match(a['aria-label'] || '', /čeština/, `${catalog}: ${file}`);
  }
});

test('every game has unique, consistent Czech search and social metadata', () => {
  const titles = new Set(), descriptions = new Set();
  for (const {file, html} of games) {
    const titleTags = [...html.matchAll(/<title>(.*?)<\/title>/g)];
    assert.equal(titleTags.length, 1, file);
    const title = decode(titleTags[0][1]);
    const h1s = [...html.matchAll(/<h1[^>]*>(.*?)<\/h1>/g)];
    assert.equal(h1s.length, 1, file);
    const h1 = decode(h1s[0][1]);
    const name = h1.replace(/ čeština$/, '');
    assert.ok(title.startsWith(`${name} čeština`), file);
    assert.match(title, /český překlad ke stažení/, file);
    assert.equal(meta(html,'description').length, 1, file);
    const description = meta(html,'description')[0];
    assert.ok(description.includes(name), file);
    for (const word of ['čeština','český překlad','ke stažení']) assert.ok(description.includes(word), `${file}: ${word}`);
    for (const key of ['og:title','twitter:title']) assert.deepEqual(meta(html,key),[title],`${file}: ${key}`);
    for (const key of ['og:description','twitter:description']) assert.deepEqual(meta(html,key),[description],`${file}: ${key}`);
    assert.ok(!titles.has(title), `duplicate title: ${file}`); titles.add(title);
    assert.ok(!descriptions.has(description), `duplicate description: ${file}`); descriptions.add(description);
    const intro = decode(html.match(/<\/h1>\s*<p>(.*?)<\/p>/s)?.[1] || '');
    assert.ok(intro.includes(`${name} čeština`), `intro: ${file}`);
  }
});

test('canonical game URLs match the sitemap and social URLs without changing slugs', () => {
  assert.equal(new Set(locs).size, locs.length, 'duplicate sitemap URL');
  for (const {file, html} of games) {
    const canonical = `https://nioczloc.com/${file}`;
    assert.deepEqual(canonicals(html),[canonical],file);
    assert.deepEqual(meta(html,'og:url'),[canonical],file);
    assert.equal(locs.filter(url=>url===canonical).length,1,file);
  }
  for (const loc of locs) {
    const u=new URL(loc);assert.equal(u.origin,'https://nioczloc.com');
    const file=u.pathname==='/'?'index.html':u.pathname.slice(1);
    assert.ok(existsSync(new URL(file,root)), `sitemap target missing: ${loc}`);
    assert.deepEqual(canonicals(read(file)),[loc],`sitemap canonical: ${loc}`);
    assert.ok(!meta(read(file),'robots').some(v=>/noindex/i.test(v)),`sitemap noindex: ${loc}`);
  }
});

test('game pages permit indexing and provide content without JavaScript', () => {
  assert.match(read('robots.txt'), /Sitemap: https:\/\/nioczloc\.com\/sitemap\.xml/);
  assert.doesNotMatch(read('robots.txt'), /^Disallow:\s*\/(?:\s|$)/m);
  for (const {file,html} of games) {
    assert.match(html, /<html lang="cs">/,file);
    assert.ok(meta(html,'viewport')[0]?.includes('width=device-width'),file);
    for(const key of ['robots','googlebot']) assert.ok(!meta(html,key).some(v=>/noindex|nofollow|none/i.test(v)),file);
    assert.match(html,/<noscript><style>\.reveal\{opacity:1;transform:none\}<\/style><\/noscript>/,file);
    assert.match(html,/<main\b/,file);
    assert.match(html,/<h2\b/,file);
  }
});

test('social image references use existing local artwork and have accessible descriptions', () => {
  for (const {file,html} of games) {
    assert.deepEqual(meta(html,'og:type'),['website'],file);
    assert.deepEqual(meta(html,'og:locale'),['cs_CZ'],file);
    assert.deepEqual(meta(html,'twitter:card'),['summary_large_image'],file);
    assert.equal(meta(html,'og:image').length,1,file);
    assert.deepEqual(meta(html,'twitter:image'),meta(html,'og:image'),file);
    for(const key of ['og:image:alt','twitter:image:alt']) assert.ok(meta(html,key)[0]?.length>0,`${file}: ${key}`);
    const u=new URL(meta(html,'og:image')[0]);assert.equal(u.origin,'https://nioczloc.com');
    assert.ok(existsSync(new URL(u.pathname.slice(1),root)),`${file}: missing image`);
  }
});

test('existing JSON-LD remains valid and matches the page without invented ratings', () => {
  for (const {file,html} of games) for (const m of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) {
    const data=JSON.parse(m[1]);
    assert.equal(data['@context'],'https://schema.org',file);
    assert.equal(data['@type'],'WebPage',file);
    assert.equal(data.url,canonicals(html)[0],file);
    assert.equal(data.name,meta(html,'og:title')[0],file);
    assert.equal(data.description,meta(html,'description')[0],file);
    assert.equal(data.inLanguage,'cs',file);
    assert.doesNotMatch(m[1],/"(?:aggregateRating|review|ratingValue)"/,file);
  }
});

test('every local page and asset link resolves, including static fragment targets', () => {
  for (const {file,html} of pages) for (const m of html.matchAll(/<(?:a|link|script|img)\b[^>]*>/g)) {
    const a=attrs(m[0]); const ref=a.href||a.src;
    if(!ref||/^(?:[a-z]+:|\/\/)/i.test(ref))continue;
    const u=new URL(ref,`https://nioczloc.com/${file}`);
    const target=u.pathname==='/'?'index.html':u.pathname.slice(1);
    assert.ok(existsSync(new URL(target,root)),`${file}: ${ref}`);
    if(u.hash && target.endsWith('.html')) {
      const id=decodeURIComponent(u.hash.slice(1));
      assert.ok(read(target).includes(`id="${id}"`),`${file}: missing fragment ${ref}`);
    }
  }
});

test('sitemap modification dates use valid, non-future calendar dates', () => {
  const today=new Date().toISOString().slice(0,10);
  for(const m of sitemap.matchAll(/<lastmod>(.*?)<\/lastmod>/g)) {
    assert.match(m[1],/^\d{4}-\d{2}-\d{2}$/);
    assert.equal(new Date(m[1]).toISOString().slice(0,10),m[1]);
    assert.ok(m[1]<=today,`future sitemap date: ${m[1]}`);
  }
});

test('Netlify leaves existing canonical HTML link paths intact', () => {
  assert.match(read('netlify.toml'), /\[build\.processing\.html\]\s*pretty_urls\s*=\s*false/);
});
