'use strict';

const fs = require('node:fs');
const path = require('node:path');
const research = require('../lib/research-map');

const ROOT = path.resolve(__dirname, '..');
const USER_AGENT = 'ai-engineering-from-scratch-research-bridge/1 (+https://github.com/rohitg00/ai-engineering-from-scratch)';
const DELAY_MS = 2000;
const TIMEOUT_MS = 30000;
const MAX_BYTES = 5 * 1024 * 1024;
const MIN_KEEP = 0.5;
const SITEMAPS = { methods: 'sitemaps/methods.xml', tasks: 'sitemaps/tasks.xml' };

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function politeFetch(url, fetcher = fetch) {
  if (!url.startsWith(`${research.SITE}/`)) throw new Error(`refusing to fetch ${url}: only ${research.SITE} is allowed`);
  const response = await fetcher(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/xml,text/plain;q=0.9' }, redirect: 'error', signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  const length = Number(response.headers.get('content-length') || 0);
  if (length > MAX_BYTES) throw new Error(`${url} is ${length} bytes; the limit is ${MAX_BYTES}`);
  const text = await response.text();
  if (text.length > MAX_BYTES) throw new Error(`${url} is larger than ${MAX_BYTES} bytes`);
  return text;
}

function robotsAllows(text, pathname) {
  let applies = false;
  let allowed = true;
  let longest = -1;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const match = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1].toLowerCase();
    const value = match[2].trim();
    if (key === 'user-agent') applies = value === '*';
    else if (applies && (key === 'allow' || key === 'disallow') && value && pathname.startsWith(value) && value.length > longest) {
      longest = value.length;
      allowed = key === 'allow';
    }
  }
  return allowed;
}

function sitemapSlugs(xml, kind) {
  const prefix = `${research.SITE}/${kind}/`;
  const slugs = new Set();
  for (const match of String(xml).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
    const loc = match[1].replace(/&amp;/g, '&');
    if (!loc.startsWith(prefix)) continue;
    const slug = decodeURIComponent(loc.slice(prefix.length)).replace(/\/+$/, '');
    if (research.SLUG.test(slug)) slugs.add(slug);
  }
  return Array.from(slugs).sort((a, b) => a.localeCompare(b, 'en'));
}

function sitemapLocations(xml) {
  return Array.from(String(xml).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g), match => match[1]);
}

async function fetchIndex({ fetcher = fetch, delay = DELAY_MS, today = new Date().toISOString().slice(0, 10) } = {}) {
  const robots = await politeFetch(`${research.SITE}/robots.txt`, fetcher);
  for (const file of Object.values(SITEMAPS)) {
    if (!robotsAllows(robots, `/${file}`)) throw new Error(`robots.txt does not allow /${file}`);
  }
  await sleep(delay);
  const locations = sitemapLocations(await politeFetch(`${research.SITE}/sitemap.xml`, fetcher));
  const index = { source: `${research.SITE}/sitemap.xml`, fetched: today, methods: [], tasks: [] };
  for (const [kind, file] of Object.entries(SITEMAPS)) {
    const url = `${research.SITE}/${file}`;
    if (!locations.includes(url)) throw new Error(`the sitemap index does not list ${url}`);
    await sleep(delay);
    index[kind] = sitemapSlugs(await politeFetch(url, fetcher), kind);
  }
  return index;
}

function guardShrink(previous, next) {
  for (const kind of Object.keys(SITEMAPS)) {
    const before = (previous && previous[kind] || []).length;
    if (before && next[kind].length < before * MIN_KEEP) {
      throw new Error(`${kind}: the sitemap now lists ${next[kind].length} slugs, down from ${before}. Stopping without changes.`);
    }
  }
}

function affected(map, gone) {
  const out = [];
  for (const kind of research.KINDS) {
    for (const [id, entry] of Object.entries(map[kind] || {})) {
      const slugs = (entry.methods || []).map(item => item.slug).filter(slug => gone.methods.includes(slug))
        .concat((entry.tasks || []).filter(slug => gone.tasks.includes(slug)));
      if (slugs.length) out.push(`${kind}/${id}: ${slugs.join(', ')}`);
    }
  }
  return out;
}

function report({ previous, index, gone, map }) {
  const added = kind => index[kind].filter(slug => !(previous[kind] || []).includes(slug));
  const removed = kind => (previous[kind] || []).filter(slug => !index[kind].includes(slug));
  const list = items => (items.length ? items.map(item => `- \`${item}\``).join('\n') : '- none');
  return [
    `# Research bridge refresh, ${index.fetched}`,
    '',
    `The ${research.SITE_NAME} sitemap lists ${index.methods.length} methods and ${index.tasks.length} tasks.`,
    '',
    '## Mapped slugs that are gone from the sitemap',
    '',
    list(gone.methods.map(slug => `methods/${slug}`).concat(gone.tasks.map(slug => `tasks/${slug}`))),
    '',
    '## Entries that lose a link',
    '',
    list(affected(map, gone)),
    '',
    '## New slugs in the sitemap',
    '',
    'A person can check these for a lesson match. The job does not add them.',
    '',
    list(added('methods').map(slug => `methods/${slug}`).concat(added('tasks').map(slug => `tasks/${slug}`))),
    '',
    '## Slugs that left the sitemap',
    '',
    list(removed('methods').map(slug => `methods/${slug}`).concat(removed('tasks').map(slug => `tasks/${slug}`))),
    '',
  ].join('\n');
}

function check(root = ROOT) {
  const map = research.loadMap(root);
  const index = research.loadIndex(root);
  const problems = research.validate(map, index, root);
  const count = kind => Object.keys(map[kind] || {}).length;
  console.log(`Checked ${count('lessons')} lessons, ${count('topics')} cheat sheet topics and ${count('practice')} practice problems against ${Object.keys(map.methods).length} methods and ${Object.keys(map.tasks).length} tasks (sitemap of ${index.fetched}).`);
  for (const problem of problems) console.error(`  ${problem}`);
  return problems.length ? 1 : 0;
}

async function refresh({ root = ROOT, prune = false, reportFile = '', fetcher = fetch, delay = DELAY_MS } = {}) {
  const previous = research.loadIndex(root);
  const map = research.loadMap(root);
  const index = await fetchIndex({ fetcher, delay });
  guardShrink(previous, index);
  const gone = research.vanished(map, index);
  const indexChanged = JSON.stringify({ ...previous, fetched: '' }) !== JSON.stringify({ ...index, fetched: '' });
  if (indexChanged) fs.writeFileSync(path.join(root, research.INDEX_FILE), research.stringify(index));
  const mappingChanged = Boolean(gone.methods.length || gone.tasks.length);
  if (prune && mappingChanged) fs.writeFileSync(path.join(root, research.MAP_FILE), research.stringify(research.prune(map, gone)));
  const text = report({ previous, index, gone, map });
  if (reportFile) fs.writeFileSync(reportFile, text);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `mapping-changed=${mappingChanged}\n`);
  console.log(text);
  return { index, gone, mappingChanged, indexChanged };
}

async function main(argv) {
  const value = name => {
    const at = argv.indexOf(name);
    return at >= 0 ? argv[at + 1] || '' : '';
  };
  if (argv.includes('--refresh')) {
    await refresh({ prune: argv.includes('--prune'), reportFile: value('--report') });
    return 0;
  }
  return check();
}

if (require.main === module) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; }, error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { USER_AGENT, check, fetchIndex, guardShrink, refresh, report, robotsAllows, sitemapSlugs };
