const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const research = require('../lib/research-map');
const bridge = require('../scripts/research_bridge');
const { buildModel, pageHtml } = require('./build-research');
const { researchLinks, loadTopics } = require('./build-cheatsheets');
const lessonApi = require('../api/lesson');

const root = path.resolve(__dirname, '..');
const LESSON = 'phases/01-demo/01-lesson';

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'research-test-'));
  fs.mkdirSync(path.join(dir, LESSON, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(dir, LESSON, 'docs', 'en.md'), '# Demo\n');
  fs.mkdirSync(path.join(dir, 'cheatsheets'));
  fs.writeFileSync(path.join(dir, 'cheatsheets', 'demo.md'), '---\n');
  return dir;
}

function demoMap() {
  return {
    version: 1,
    site: research.SITE,
    methods: { grpo: 'GRPO' },
    tasks: { reasoning: 'Reasoning' },
    lessons: { [LESSON]: { methods: [{ slug: 'grpo', why: 'Builds the GRPO loss from scratch.' }], tasks: ['reasoning'] } },
    topics: {},
    practice: {},
  };
}

const INDEX = { source: `${research.SITE}/sitemap.xml`, fetched: '2026-10-19', methods: ['grpo', 'ppo'], tasks: ['reasoning'] };

test('the committed map passes every check against the committed sitemap cache', () => {
  const map = research.loadMap(root);
  const index = research.loadIndex(root);
  assert.deepEqual(research.validate(map, index, root), []);
  assert.ok(Object.keys(map.lessons).length >= 100);
  assert.ok(index.methods.length >= 100 && index.tasks.length >= 50);
  for (const [id, entry] of Object.entries(map.lessons)) {
    for (const item of entry.methods) assert.doesNotMatch(item.why, /—/, `${id} ${item.slug}`);
  }
});

test('a valid map has no problems and each kind of mistake is reported', () => {
  const dir = fixture();
  assert.deepEqual(research.validate(demoMap(), INDEX, dir), []);
  const broken = demoMap();
  broken.methods.missing = 'Missing';
  broken.methods.ppo = 'PPO';
  broken.lessons[LESSON].methods.push({ slug: 'missing', why: 'x' }, { slug: 'grpo', why: '' });
  broken.lessons['phases/01-demo/99-nowhere'] = { methods: [{ slug: 'grpo', why: 'Builds it.' }] };
  broken.topics.nowhere = { methods: [] };
  const problems = research.validate(broken, INDEX, dir).join('\n');
  assert.match(problems, /"missing" is not in the paperswithcode\.co sitemap/);
  assert.match(problems, /lists grpo twice/);
  assert.match(problems, /needs a why/);
  assert.match(problems, /99-nowhere"\] has no docs\/en\.md/);
  assert.match(problems, /topics\["nowhere"\] has no cheatsheets\/nowhere\.md/);
  assert.match(problems, /topics\["nowhere"\] maps nothing/);
  assert.match(problems, /"ppo" is not used/);
  const long = demoMap();
  long.lessons[LESSON].methods[0].why = 'x'.repeat(121);
  assert.match(research.validate(long, INDEX, dir).join('\n'), /the limit is 120/);
});

test('practice ids are accepted now and checked once a practice folder exists', () => {
  const dir = fixture();
  const map = demoMap();
  map.practice['grpo-loss'] = { methods: [{ slug: 'grpo', why: 'Asks for the GRPO loss.' }] };
  assert.deepEqual(research.validate(map, INDEX, dir), []);
  fs.mkdirSync(path.join(dir, 'practice'));
  assert.match(research.validate(map, INDEX, dir).join('\n'), /practice\["grpo-loss"\] is not in the practice folder/);
  fs.mkdirSync(path.join(dir, 'practice', 'grpo-loss'));
  assert.deepEqual(research.validate(map, INDEX, dir), []);
});

test('slugs that leave the sitemap are found and pruned without touching other links', () => {
  const map = demoMap();
  map.methods.ppo = 'PPO';
  map.lessons[LESSON].methods.push({ slug: 'ppo', why: 'Builds PPO.' });
  const index = { ...INDEX, methods: ['ppo'], tasks: [] };
  const gone = research.vanished(map, index);
  assert.deepEqual(gone, { methods: ['grpo'], tasks: ['reasoning'] });
  const next = research.prune(map, gone);
  assert.deepEqual(next.lessons[LESSON], { methods: [{ slug: 'ppo', why: 'Builds PPO.' }] });
  assert.deepEqual(Object.keys(next.methods), ['ppo']);
  assert.deepEqual(next.tasks, {});
  assert.deepEqual(research.validate(next, index, fixture()), []);
  assert.deepEqual(map.methods.grpo, 'GRPO');
});

test('sitemap parsing keeps only slugs of the requested kind and robots rules are honoured', () => {
  const xml = `<urlset><url><loc>${research.SITE}/methods/grpo</loc></url><url><loc>${research.SITE}/methods/multi-head-attention</loc></url><url><loc>${research.SITE}/tasks/reasoning</loc></url><url><loc>https://elsewhere.example/methods/evil</loc></url><url><loc>${research.SITE}/methods/bad slug</loc></url></urlset>`;
  assert.deepEqual(bridge.sitemapSlugs(xml, 'methods'), ['grpo', 'multi-head-attention']);
  assert.deepEqual(bridge.sitemapSlugs(xml, 'tasks'), ['reasoning']);
  assert.equal(bridge.robotsAllows('User-agent: *\nAllow: /', '/sitemaps/methods.xml'), true);
  assert.equal(bridge.robotsAllows('User-agent: *\nDisallow: /sitemaps/', '/sitemaps/methods.xml'), false);
  assert.equal(bridge.robotsAllows('User-agent: other\nDisallow: /', '/sitemaps/methods.xml'), true);
  assert.equal(bridge.robotsAllows('User-agent: *\nDisallow: /sitemaps/\nAllow: /sitemaps/methods.xml', '/sitemaps/methods.xml'), true);
});

test('the refresh fetches only robots, the sitemap index and two sitemaps, and refuses a collapsed sitemap', async () => {
  const seen = [];
  const pages = {
    [`${research.SITE}/robots.txt`]: 'User-agent: *\nAllow: /',
    [`${research.SITE}/sitemap.xml`]: `<sitemapindex><sitemap><loc>${research.SITE}/sitemaps/methods.xml</loc></sitemap><sitemap><loc>${research.SITE}/sitemaps/tasks.xml</loc></sitemap></sitemapindex>`,
    [`${research.SITE}/sitemaps/methods.xml`]: `<urlset><url><loc>${research.SITE}/methods/grpo</loc></url></urlset>`,
    [`${research.SITE}/sitemaps/tasks.xml`]: `<urlset><url><loc>${research.SITE}/tasks/reasoning</loc></url></urlset>`,
  };
  const fetcher = async (url, options) => {
    seen.push(url);
    assert.equal(options.headers['User-Agent'], bridge.USER_AGENT);
    assert.equal(options.redirect, 'error');
    return { ok: true, status: 200, headers: { get: () => null }, text: async () => pages[url] };
  };
  const index = await bridge.fetchIndex({ fetcher, delay: 0, today: '2026-10-20' });
  assert.deepEqual(seen, Object.keys(pages));
  assert.deepEqual(index, { source: `${research.SITE}/sitemap.xml`, fetched: '2026-10-20', methods: ['grpo'], tasks: ['reasoning'] });
  assert.throws(() => bridge.guardShrink({ methods: ['a', 'b', 'c'], tasks: ['t'] }, index), /down from 3/);
  assert.doesNotThrow(() => bridge.guardShrink({ methods: ['grpo'], tasks: ['reasoning'] }, index));
});

test('the refresh writes the cache, prunes vanished slugs and reports them', async () => {
  const dir = fixture();
  fs.mkdirSync(path.join(dir, 'research'));
  const map = demoMap();
  map.methods.ppo = 'PPO';
  map.lessons[LESSON].methods.push({ slug: 'ppo', why: 'Builds PPO.' });
  fs.writeFileSync(path.join(dir, research.MAP_FILE), research.stringify(map));
  fs.writeFileSync(path.join(dir, research.INDEX_FILE), research.stringify(INDEX));
  const pages = {
    [`${research.SITE}/robots.txt`]: 'User-agent: *\nAllow: /',
    [`${research.SITE}/sitemap.xml`]: `<loc>${research.SITE}/sitemaps/methods.xml</loc><loc>${research.SITE}/sitemaps/tasks.xml</loc>`,
    [`${research.SITE}/sitemaps/methods.xml`]: `<loc>${research.SITE}/methods/ppo</loc><loc>${research.SITE}/methods/dpo</loc>`,
    [`${research.SITE}/sitemaps/tasks.xml`]: `<loc>${research.SITE}/tasks/reasoning</loc>`,
  };
  const fetcher = async url => ({ ok: true, status: 200, headers: { get: () => null }, text: async () => pages[url] });
  const reportFile = path.join(dir, 'report.md');
  const log = console.log;
  console.log = () => {};
  let result;
  try {
    result = await bridge.refresh({ root: dir, prune: true, reportFile, fetcher, delay: 0 });
  } finally {
    console.log = log;
  }
  assert.equal(result.mappingChanged, true);
  assert.deepEqual(result.gone.methods, ['grpo']);
  const next = research.loadMap(dir);
  assert.deepEqual(next.lessons[LESSON].methods.map(item => item.slug), ['ppo']);
  assert.deepEqual(research.loadIndex(dir).methods, ['dpo', 'ppo']);
  const text = fs.readFileSync(reportFile, 'utf8');
  assert.match(text, /- `methods\/grpo`/);
  assert.match(text, /- `methods\/dpo`/);
});

test('the lesson panel links each mapped method and task to its outbound page', () => {
  const research = {
    [LESSON]: { methods: [{ slug: 'grpo', name: 'GRPO' }, { slug: 'bad slug', name: 'Bad' }, { slug: 'x', name: '<b>' }], tasks: [{ slug: 'reasoning', name: 'Reasoning' }] },
  };
  const page = { hub: '/phase/demo', lang: 'en' };
  const html = lessonApi.lessonResearch({ path: LESSON }, page, research);
  assert.match(html, /<aside class="lesson-research" aria-labelledby="lessonResearchTitle">/);
  assert.match(html, /<a href="https:\/\/paperswithcode\.co\/methods\/grpo" target="_blank" rel="noopener">GRPO<span class="lesson-research-arrow" aria-hidden="true">↗<\/span><\/a>/);
  assert.match(html, /https:\/\/paperswithcode\.co\/tasks\/reasoning/);
  assert.match(html, /&lt;b&gt;/);
  assert.doesNotMatch(html, /bad slug/);
  assert.match(html, /href="\/research"/);
  assert.equal(lessonApi.lessonResearch({ path: LESSON }, { hub: '/phase/demo', lang: 'hi' }, research), '');
  assert.equal(lessonApi.lessonResearch({ path: 'phases/01-demo/02-other' }, page, research), '');
});

test('a served lesson page shows the panel below the lesson content', async () => {
  const map = research.loadMap(root);
  const lessonPath = Object.keys(map.lessons).find(id => map.lessons[id].methods.length);
  const manifestFile = path.join(root, 'site', 'lesson-seo.json');
  const mapFile = path.join(root, 'site', 'research-map.json');
  if (!fs.existsSync(manifestFile) || !fs.existsSync(mapFile)) return;
  const response = {
    headers: {},
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(body) { this.body = String(body); },
  };
  await lessonApi({ method: 'GET', url: `/lesson?path=${encodeURIComponent(lessonPath)}`, query: { path: lessonPath }, headers: {} }, response);
  assert.equal(response.statusCode, 200);
  const html = response.body;
  const slug = map.lessons[lessonPath].methods[0].slug;
  assert.ok(html.indexOf('id="lessonContent"') < html.indexOf('class="lesson-research"'));
  assert.ok(html.indexOf('class="lesson-research"') < html.indexOf('AIFS:LESSON-HUBS:END'));
  assert.match(html, new RegExp(`paperswithcode\\.co/methods/${slug}" target="_blank" rel="noopener"`));
});

test('cheat sheet posters get a research line from their own entry or from the lessons they cover', () => {
  const topics = loadTopics(root);
  const links = researchLinks(topics, root);
  const map = research.loadMap(root);
  for (const [id, entry] of Object.entries(map.topics)) {
    assert.deepEqual(links[id].map(item => item.slug), entry.methods.map(item => item.slug).slice(0, 6), id);
  }
  const derived = topics.filter(topic => !map.topics[topic.id] && links[topic.id].length);
  assert.ok(derived.length > 20);
  for (const topic of topics) {
    assert.ok(links[topic.id].length <= 6, topic.id);
    for (const item of links[topic.id]) assert.equal(item.href, research.methodUrl(item.slug));
  }
});

test('the research index groups methods by area, links both ways and stays static', () => {
  const map = research.loadMap(root);
  const index = research.loadIndex(root);
  const manifest = { lessons: { [LESSON]: { title: 'Demo lesson', context: { kind: 'course', phaseId: 1, phaseName: 'Demo' } } } };
  const model = buildModel({ map: demoMap(), lessonManifest: manifest, topics: [{ id: 'demo', title: 'Demo sheet', research: [{ slug: 'grpo' }] }] });
  assert.equal(model.areas.length, 1);
  assert.equal(model.areas[0].label, 'Phase 01: Demo');
  assert.equal(model.areas[0].methods[0].lessons[0].href, `/lesson?path=${encodeURIComponent(LESSON)}`);
  assert.deepEqual(model.areas[0].methods[0].topics.map(sheet => sheet.href), ['/cheatsheets/demo']);
  const html = pageHtml(model, demoMap(), index, __dirname);
  assert.match(html, /<link rel="canonical" href="https:\/\/aiengineeringfromscratch\.com\/research">/);
  assert.match(html, /<meta property="og:image" content="https:\/\/aiengineeringfromscratch\.com\/og\/page\/research\.png">/);
  assert.match(html, /id="m-grpo"/);
  assert.match(html, /href="https:\/\/paperswithcode\.co\/methods\/grpo" target="_blank" rel="noopener"/);
  assert.match(html, /<div class="rs-search" role="search" hidden>/);
  assert.match(html, /application\/ld\+json/);
  assert.doesNotMatch(html, /fetch\(/);
  const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  const rewrites = vercel.rewrites.filter(rule => rule.source === '/research').map(rule => rule.destination);
  assert.deepEqual(rewrites, ['/agent-pages/research.md', '/hubs/research.html']);
  assert.ok(vercel.redirects.some(rule => rule.source === '/hubs/research.html' && rule.destination === '/research' && rule.permanent));
  assert.ok(vercel.functions['api/lesson.js'].includeFiles.includes('site/research-map.json'));
  const markdown = require('./build-research').researchMarkdown(model, index);
  assert.match(markdown, /^# Research methods to from-scratch lessons/);
  assert.match(markdown, /Papers and code: https:\/\/paperswithcode\.co\/methods\/grpo/);
  assert.doesNotMatch(markdown, /<script|<!DOCTYPE/i);
  assert.ok(require('../lib/og-cards').PAGES.research);
});

test('the weekly workflow refreshes on a schedule, pins its actions and adds no secrets', () => {
  const text = fs.readFileSync(path.join(root, '.github', 'workflows', 'research-bridge.yml'), 'utf8');
  assert.match(text, /schedule:/);
  assert.match(text, /workflow_dispatch:/);
  for (const match of text.matchAll(/uses:\s*(\S+)/g)) assert.match(match[1], /@[0-9a-f]{40}$/, match[1]);
  const secrets = Array.from(text.matchAll(/secrets\.([A-Z_]+)/g), match => match[1]);
  assert.ok(secrets.every(name => name === 'GITHUB_TOKEN'), secrets.join(','));
  assert.match(text, /--refresh --prune/);
  assert.match(text, /mapping-changed == 'true'/);
});
