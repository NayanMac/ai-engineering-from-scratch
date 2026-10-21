'use strict';

const fs = require('node:fs');
const path = require('node:path');
const research = require('../lib/research-map');
const { phaseHubPath, phaseLabel } = require('../lib/hub-routes');
const { SITE_HEADER } = require('./build-hubs');
const { versionHtml } = require('./version-assets');

const ORIGIN = 'https://aiengineeringfromscratch.com';
const REPO = 'https://github.com/rohitg00/ai-engineering-from-scratch';
const ROUTE = '/research';
const PAGE_FILE = 'hubs/research.html';
const MARKDOWN_FILE = 'agent-pages/research.md';
const LESSON_MAP_FILE = 'research-map.json';
const TITLE = 'Research methods to from-scratch lessons - AI Engineering from Scratch';
const DESCRIPTION = 'Find the lesson that builds a research method from scratch, then open current papers, code and benchmarks for that method on paperswithcode.co.';
const FONT_LINK = 'https://fonts.googleapis.com/css2?family=VT323&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..700&family=JetBrains+Mono:wght@400;500;700&display=swap';
const THEME_SCRIPT = "(function(){var r=document.documentElement,s='';try{s=localStorage.getItem('theme')||'';}catch(_){}r.setAttribute('data-theme',s||(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));function i(){var e=document.getElementById('themeIcon');if(e)e.textContent=r.getAttribute('data-theme')==='light'?'N':'D';}document.addEventListener('DOMContentLoaded',function(){i();var b=document.getElementById('themeToggle');if(b)b.addEventListener('click',function(){var n=r.getAttribute('data-theme')==='light'?'dark':'light';r.setAttribute('data-theme',n);try{localStorage.setItem('theme',n);}catch(_){}i();});});})();";
const HEAD_ASSETS = '<link rel="stylesheet" href="/style.css">\n<link rel="stylesheet" href="/hubs.css">\n<link rel="stylesheet" href="/research.css">';
const BODY_ASSETS = '<script src="/header.js" defer></script>\n<script src="/research.js" defer></script>';
const OTHER_AREA = 'Cheat sheet topics';

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function jsonForHtml(value) {
  return JSON.stringify(value).replace(/&/g, '\\u0026').replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

function count(value, singular, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function lessonHref(lessonPath) {
  return `/lesson?path=${encodeURIComponent(lessonPath)}`;
}

function lessonNumber(lessonPath) {
  const match = /^phases\/(\d+)-[^/]+\/(\d+)-/.exec(lessonPath);
  return match ? `${match[1]}.${match[2]}` : '';
}

function outbound(href, label, context) {
  return `<a class="rs-out" href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(label)}<span class="rs-sr"> for ${escapeHtml(context)} on ${research.SITE_NAME}, external site</span><span class="rs-arrow" aria-hidden="true">↗</span></a>`;
}

function lessonInfo(lessonPath, lessonManifest) {
  const entry = lessonManifest.lessons[lessonPath] || {};
  const context = entry.context || {};
  return {
    path: lessonPath,
    href: lessonHref(lessonPath),
    title: entry.title || lessonPath.split('/').pop().replace(/^\d+-/, '').replace(/-/g, ' '),
    number: lessonNumber(lessonPath),
    area: context.phaseId == null ? '' : phaseLabel(context.phaseId, context.phaseName),
    areaOrder: context.phaseId == null ? 999 : Number(context.phaseId),
    hub: phaseHubPath(lessonPath),
  };
}

function buildModel({ map, lessonManifest, topics = [] }) {
  const methods = new Map();
  const tasks = new Map();
  const method = slug => {
    if (!methods.has(slug)) methods.set(slug, { slug, name: map.methods[slug], href: research.methodUrl(slug), lessons: [], topics: [], tasks: new Set() });
    return methods.get(slug);
  };
  const task = slug => {
    if (!tasks.has(slug)) tasks.set(slug, { slug, name: map.tasks[slug], href: research.taskUrl(slug), lessons: [], topics: [] });
    return tasks.get(slug);
  };
  for (const [lessonPath, entry] of Object.entries(map.lessons).sort(([a], [b]) => a.localeCompare(b, 'en'))) {
    const lesson = lessonInfo(lessonPath, lessonManifest);
    for (const item of entry.methods || []) {
      const target = method(item.slug);
      target.lessons.push({ ...lesson, why: item.why });
      for (const slug of entry.tasks || []) target.tasks.add(slug);
    }
    for (const slug of entry.tasks || []) task(slug).lessons.push(lesson);
  }
  for (const topic of topics.slice().sort((a, b) => a.title.localeCompare(b.title, 'en'))) {
    const sheet = { id: topic.id, title: topic.title, href: `/cheatsheets/${topic.id}` };
    for (const item of topic.research || []) if (map.methods[item.slug]) method(item.slug).topics.push(sheet);
    const entry = map.topics[topic.id];
    for (const slug of (entry && entry.tasks) || []) task(slug).topics.push(sheet);
  }
  const areas = new Map();
  for (const item of methods.values()) {
    const first = item.lessons[0];
    const key = first && first.area ? first.area : OTHER_AREA;
    if (!areas.has(key)) areas.set(key, { label: key, order: first ? first.areaOrder : 1000, hub: first ? first.hub : '', methods: [] });
    areas.get(key).methods.push(item);
  }
  const sortedAreas = Array.from(areas.values()).sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'en'));
  for (const area of sortedAreas) area.methods.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  const lessons = new Set(Object.keys(map.lessons));
  return {
    areas: sortedAreas,
    methods: Array.from(methods.values()),
    tasks: Array.from(tasks.values()).sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })),
    lessonCount: lessons.size,
    topicCount: topics.filter(topic => (topic.research || []).length).length,
  };
}

function searchText(parts) {
  return parts.filter(Boolean).join(' ').toLowerCase().replace(/\s+/g, ' ').trim();
}

function methodHtml(item, taskNames) {
  const lessons = item.lessons.map(lesson => `<li><a href="${escapeHtml(lesson.href)}">${escapeHtml(lesson.title)}</a>${lesson.number ? `<span class="rs-num">Lesson ${escapeHtml(lesson.number)}</span>` : ''}<p>${escapeHtml(lesson.why)}</p></li>`).join('');
  const sheets = item.topics.length ? `<p class="rs-sheets"><span class="hub-label">Cheat sheet</span> ${item.topics.map(sheet => `<a href="${escapeHtml(sheet.href)}">${escapeHtml(sheet.title)}</a>`).join(', ')}</p>` : '';
  const query = searchText([item.name, item.slug.replace(/-/g, ' ')].concat(item.lessons.map(lesson => lesson.title), item.topics.map(sheet => sheet.title), Array.from(item.tasks).map(slug => taskNames[slug])));
  return `<li class="rs-method" id="m-${escapeHtml(item.slug)}" data-q="${escapeHtml(query)}"><div class="rs-head"><h3>${escapeHtml(item.name)}</h3>${outbound(item.href, 'Papers and code', item.name)}</div>${lessons ? `<ul class="rs-lessons">${lessons}</ul>` : ''}${sheets}</li>`;
}

function taskHtml(item) {
  const links = item.lessons.map(lesson => `<a href="${escapeHtml(lesson.href)}">${escapeHtml(lesson.title)}</a>`)
    .concat(item.topics.map(sheet => `<a href="${escapeHtml(sheet.href)}">${escapeHtml(sheet.title)} cheat sheet</a>`));
  const query = searchText([item.name, item.slug.replace(/-/g, ' ')].concat(item.lessons.map(lesson => lesson.title), item.topics.map(sheet => sheet.title)));
  return `<li class="rs-task" id="t-${escapeHtml(item.slug)}" data-q="${escapeHtml(query)}"><div class="rs-head"><h3>${escapeHtml(item.name)}</h3>${outbound(item.href, 'Task page', item.name)}</div><p>${links.join(', ')}</p></li>`;
}

function pageMain(model, map, index) {
  const crumbs = `<nav class="hub-breadcrumb" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li><span aria-current="page">Research</span></li></ol></nav>`;
  const stats = `<ul class="hub-stats"><li><strong>${model.methods.length}</strong> methods</li><li><strong>${model.lessonCount}</strong> lessons</li><li><strong>${model.tasks.length}</strong> tasks</li><li><strong>${model.topicCount}</strong> cheat sheets</li></ul>`;
  const search = `<div class="rs-search" role="search" hidden><label for="rs-q" class="hub-label">Search methods, tasks and lessons</label><input id="rs-q" type="search" autocomplete="off" spellcheck="false" placeholder="grpo, kv cache, object detection"><p class="rs-count" aria-live="polite"></p></div>`;
  const hero = `<header class="hub-hero"><p class="hub-kicker">Research bridge</p><h1>Find the lesson that builds a method</h1><p class="hub-lede">Each method below links to the course lessons that build it from scratch. It also links to its page on ${research.SITE_NAME}, where you can find current papers, code and benchmarks that use it.</p>${stats}${search}</header>`;
  const areas = model.areas.map((area, position) => {
    const id = `area-${position + 1}`;
    const label = area.hub ? `<a href="${escapeHtml(area.hub)}">${escapeHtml(area.label)}</a>` : escapeHtml(area.label);
    return `<section class="hub-section rs-area" aria-labelledby="${id}"><h2 id="${id}">${label}</h2><ul class="rs-methods">${area.methods.map(item => methodHtml(item, map.tasks)).join('')}</ul></section>`;
  }).join('');
  const tasks = model.tasks.length ? `<section class="hub-section rs-area" aria-labelledby="tasks"><h2 id="tasks">Tasks</h2><p>A task page shows benchmarks and leading results for one problem, such as object detection.</p><ul class="rs-methods">${model.tasks.map(taskHtml).join('')}</ul></section>` : '';
  const empty = '<p class="rs-empty" hidden>No method matches this search. Try a shorter word, or open the <a href="/catalog">course catalog</a>.</p>';
  const about = `<section class="hub-section" aria-labelledby="about-map"><h2 id="about-map">About this map</h2><p>A person checked each link. A lesson links to a method only when the lesson builds or explains that method as a main subject. The method and task pages are on ${research.SITE_NAME}, an external site that this course does not control. This site does not copy its content.</p><p>A weekly job compares the map with the ${research.SITE_NAME} sitemap of ${escapeHtml(index.fetched)} and later. The map is <a href="${REPO}/blob/main/${research.MAP_FILE}">${research.MAP_FILE}</a> on GitHub. To add a link, edit that file and open a pull request.</p></section>`;
  return `<main id="main" class="hub-page rs-page"><div class="container hub-wrap">${crumbs}${hero}${areas}${tasks}${empty}${about}</div></main>`;
}

function footerHtml() {
  const links = [['/', 'Home'], ['/catalog', 'Course catalog'], ['/cheatsheets', 'Cheat sheets'], ['/glossary', 'Glossary'], ['/sponsors', 'Sponsor us'], [REPO, 'GitHub']];
  return `<footer class="site-footer"><div class="container footer-inner"><p>AI Engineering from Scratch · open source · free forever.</p><div class="footer-links">${links.map(([href, label]) => `<a href="${escapeHtml(href)}"${href.startsWith('https:') ? ' target="_blank" rel="noopener"' : ''}>${escapeHtml(label)}</a>`).join('')}</div></div></footer>`;
}

function jsonLd(model) {
  const canonical = ORIGIN + ROUTE;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonical}#page`,
        name: 'Research methods to from-scratch lessons',
        description: DESCRIPTION,
        url: canonical,
        inLanguage: 'en',
        isPartOf: { '@type': 'WebSite', name: 'AI Engineering from Scratch', url: ORIGIN },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: model.methods.length,
          itemListElement: model.areas.flatMap(area => area.methods).map((item, position) => ({ '@type': 'ListItem', position: position + 1, name: item.name, url: `${canonical}#m-${item.slug}` })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: ORIGIN },
          { '@type': 'ListItem', position: 2, name: 'Research', item: canonical },
        ],
      },
    ],
  };
}

function pageHtml(model, map, index, siteDir) {
  const canonical = ORIGIN + ROUTE;
  const image = `${ORIGIN}/og/page/research.png`;
  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<base href="/">
<title>${escapeHtml(TITLE)}</title>
<meta name="description" content="${escapeHtml(DESCRIPTION)}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${escapeHtml(TITLE)}">
<meta property="og:description" content="${escapeHtml(DESCRIPTION)}">
<meta property="og:image" content="${image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${image}">
<meta property="og:url" content="${canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="AI Engineering from Scratch">
<meta name="twitter:title" content="${escapeHtml(TITLE)}">
<meta name="twitter:description" content="${escapeHtml(DESCRIPTION)}">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONT_LINK}" rel="stylesheet">
${versionHtml(HEAD_ASSETS, siteDir)}
<script>${THEME_SCRIPT}</script>
<script type="application/ld+json">${jsonForHtml(jsonLd(model))}</script>
</head>
<body>
<a href="${ROUTE}#main" class="skip-link">Skip to content</a>
${SITE_HEADER}
${pageMain(model, map, index)}
${footerHtml()}
${versionHtml(BODY_ASSETS, siteDir)}
<script defer src="https://va.vercel-scripts.com/v1/script.js"></script>
</body>
</html>
`;
}

function researchMarkdown(model, index) {
  const lines = ['# Research methods to from-scratch lessons', '', `Canonical page: ${ORIGIN}${ROUTE}`, '', DESCRIPTION, '', `Sitemap of ${research.SITE_NAME}: ${index.fetched}. Map source: ${REPO}/blob/main/${research.MAP_FILE}`];
  for (const area of model.areas) {
    lines.push('', `## ${area.label}`);
    for (const item of area.methods) {
      lines.push('', `### ${item.name}`, '', `Papers and code: ${item.href}`, '');
      for (const lesson of item.lessons) lines.push(`- [${lesson.title}](${ORIGIN}${lesson.href}): ${lesson.why}`);
      for (const sheet of item.topics) lines.push(`- [${sheet.title} cheat sheet](${ORIGIN}${sheet.href})`);
    }
  }
  if (model.tasks.length) {
    lines.push('', '## Tasks');
    for (const item of model.tasks) {
      lines.push('', `### ${item.name}`, '', `Task page: ${item.href}`, '');
      for (const lesson of item.lessons) lines.push(`- [${lesson.title}](${ORIGIN}${lesson.href})`);
    }
  }
  lines.push('', `[Course catalog](${ORIGIN}/catalog) | [Curriculum index](${ORIGIN}/llms.txt)`, '');
  return lines.join('\n');
}

function buildResearch({ root = path.resolve(__dirname, '..'), siteDir = __dirname, lessonManifest, topics = [] }) {
  const map = research.loadMap(root);
  const index = research.loadIndex(root);
  const problems = research.validate(map, index, root);
  if (problems.length) throw new Error(`${research.MAP_FILE} has errors. Run node scripts/research_bridge.js for the full report.\n${problems.join('\n')}`);
  const model = buildModel({ map, lessonManifest, topics });
  return { model, map, index, html: pageHtml(model, map, index, siteDir), markdown: researchMarkdown(model, index), lessonMap: research.siteMap(map) };
}

function writeResearch(options) {
  const siteDir = options.siteDir || __dirname;
  const built = buildResearch({ ...options, siteDir });
  for (const [file, body] of [[PAGE_FILE, built.html], [MARKDOWN_FILE, built.markdown]]) {
    fs.mkdirSync(path.dirname(path.join(siteDir, file)), { recursive: true });
    fs.writeFileSync(path.join(siteDir, file), body, 'utf8');
  }
  fs.writeFileSync(path.join(siteDir, LESSON_MAP_FILE), `${JSON.stringify({ lessons: built.lessonMap.lessons })}\n`, 'utf8');
  console.log(`   wrote ${PAGE_FILE} (${count(built.model.methods.length, 'method')}, ${count(built.model.lessonCount, 'lesson')}, ${count(built.model.tasks.length, 'task')})`);
  return built;
}

module.exports = { ROUTE, PAGE_FILE, MARKDOWN_FILE, researchMarkdown, LESSON_MAP_FILE, buildModel, buildResearch, writeResearch, pageHtml };
