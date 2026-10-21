'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const markdown = require('./lesson-markdown');
const { phaseSlug } = require('../lib/hub-routes');
const { SITE_HEADER } = require('./build-hubs');
const { versionHtml } = require('./version-assets');

const ORIGIN = 'https://aiengineeringfromscratch.com';
const REPO = 'https://github.com/rohitg00/ai-engineering-from-scratch';
const REPO_ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = 'practice';
const OUTPUT_DIR = 'practice';
const BASE = '/practice';
const TRACKS = `${BASE}/tracks`;
const CARD = 'page/practice';
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const DIFFICULTY_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const LAYERS = ['examples', 'properties', 'edge', 'reference'];
const PYODIDE_VERSION = '314.0.7';
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const FILES = ['meta.json', 'problem.md', 'starter.py', 'solution.py', 'tests.py', 'hints.md', 'notes.md', 'fixtures.json'];
const META_KEYS = ['id', 'title', 'summary', 'difficulty', 'tags', 'lesson', 'cheatsheet', 'minutes', 'entry', 'collections', 'time_limit_s', 'mutants'];
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FONT_LINK = 'https://fonts.googleapis.com/css2?family=VT323&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..700&family=JetBrains+Mono:wght@400;500;700&display=swap';
const THEME_SCRIPT = "(function(){var r=document.documentElement,s='';try{s=localStorage.getItem('theme')||'';}catch(_){}r.setAttribute('data-theme',s||(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));function i(){var e=document.getElementById('themeIcon');if(e)e.textContent=r.getAttribute('data-theme')==='light'?'N':'D';}document.addEventListener('DOMContentLoaded',function(){i();var b=document.getElementById('themeToggle');if(b)b.addEventListener('click',function(){var n=r.getAttribute('data-theme')==='light'?'dark':'light';r.setAttribute('data-theme',n);try{localStorage.setItem('theme',n);}catch(_){}i();});});})();";
const HEAD_ASSETS = '<link rel="stylesheet" href="/style.css">\n<link rel="stylesheet" href="/practice.css">';
const BODY_ASSETS = '<script src="/header.js" defer></script>\n<script src="/lesson-markdown.js" defer></script>\n<script src="/practice-store.js" defer></script>\n<script src="/practice.js" defer></script>';
const FOOTER_LINKS = [['/practice', 'Practice'], ['/catalog', 'Catalog'], ['/roadmap', 'Roadmap'], ['/cheatsheets', 'Cheat Sheets'], ['/glossary', 'Glossary'], ['/about', 'About']];

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function jsonForHtml(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

function sha(text) {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function renderMarkdown(md) {
  return markdown.parseMd(md);
}

function hintList(md) {
  const parts = md.replace(/\r\n/g, '\n').split(/^## .+$/m);
  return parts.slice(1).map(part => part.trim()).filter(Boolean);
}

function lessonTitle(root, lesson) {
  const file = path.join(root, lesson, 'docs', 'en.md');
  if (!fs.existsSync(file)) return '';
  const match = /^#\s+(.+?)\s*$/m.exec(read(file));
  return match ? match[1] : '';
}

function phaseOf(root, lesson) {
  const dir = lesson.split('/')[1] || '';
  const number = Number((/^(\d+)-/.exec(dir) || [])[1]);
  const readme = path.join(root, 'phases', dir, 'README.md');
  const title = fs.existsSync(readme) ? /^#\s+Phase\s+\d+\s*:\s*(.+?)\s*$/m.exec(read(readme)) : null;
  return { number, slug: phaseSlug(dir), name: title ? title[1] : dir.replace(/^\d+-/, '').replace(/-/g, ' ') };
}

function metaErrors(meta, id) {
  const errors = [];
  for (const key of META_KEYS) if (!(key in meta)) errors.push(`${id}: meta.json has no ${key}`);
  if (errors.length) return errors;
  if (meta.id !== id) errors.push(`${id}: meta.json id is ${meta.id}`);
  if (!ID.test(meta.id)) errors.push(`${id}: the id must be lower case words joined by hyphens`);
  if (!DIFFICULTIES.includes(meta.difficulty)) errors.push(`${id}: unknown difficulty ${meta.difficulty}`);
  if (!Array.isArray(meta.tags) || !meta.tags.every(tag => ID.test(tag))) errors.push(`${id}: tags must be lower case hyphenated words`);
  if (!Array.isArray(meta.collections)) errors.push(`${id}: collections must be a list`);
  if (!/^phases\/\d\d-[a-z0-9-]+\/\d\d-[a-z0-9-]+$/.test(meta.lesson)) errors.push(`${id}: lesson must be phases/NN-phase/MM-lesson`);
  return errors;
}

function problemDirs(root) {
  const dir = path.join(root, SOURCE_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('_') && fs.existsSync(path.join(dir, entry.name, 'meta.json')))
    .map(entry => entry.name)
    .sort();
}

function loadCollections(root) {
  const file = path.join(root, SOURCE_DIR, 'collections.json');
  return fs.existsSync(file) ? JSON.parse(read(file)) : [];
}

function loadProblem(root, id) {
  const dir = path.join(root, SOURCE_DIR, id);
  const missing = FILES.filter(name => !fs.existsSync(path.join(dir, name)));
  if (missing.length) return { id, errors: missing.map(name => `${id}: missing ${name}`) };
  const meta = JSON.parse(read(path.join(dir, 'meta.json')));
  const errors = metaErrors(meta, id);
  if (errors.length) return { id, errors };
  if (!fs.existsSync(path.join(root, meta.lesson, 'docs', 'en.md'))) errors.push(`${id}: lesson ${meta.lesson} does not exist`);
  if (meta.cheatsheet && !fs.existsSync(path.join(root, 'cheatsheets', `${meta.cheatsheet}.md`))) errors.push(`${id}: cheat sheet ${meta.cheatsheet} does not exist`);
  const files = {};
  for (const name of FILES) files[name] = read(path.join(dir, name));
  const hints = hintList(files['hints.md']);
  return {
    id,
    meta,
    errors,
    files,
    href: `${BASE}/${id}`,
    phase: phaseOf(root, meta.lesson),
    lessonTitle: lessonTitle(root, meta.lesson) || meta.lesson,
    statementHtml: renderMarkdown(files['problem.md']),
    hintsHtml: hints.map(renderMarkdown),
    notesHtml: renderMarkdown(files['notes.md']),
    version: sha(FILES.filter(name => name !== 'solution.py').map(name => files[name]).join('\u0000')),
    checks: countChecks(files['tests.py']),
  };
}

function countChecks(tests) {
  const counts = { examples: 0, properties: 0, edge: 0, reference: 0 };
  for (const match of tests.matchAll(/^@check\(\s*"(examples|properties|edge|reference)"/gm)) counts[match[1]] += 1;
  return counts;
}

function loadPractice(root = REPO_ROOT) {
  const collections = loadCollections(root);
  const problems = problemDirs(root).map(id => loadProblem(root, id));
  const errors = problems.flatMap(problem => problem.errors);
  const known = new Set(collections.map(item => item.id));
  for (const problem of problems) {
    if (!problem.meta) continue;
    for (const name of problem.meta.collections) if (!known.has(name)) errors.push(`${problem.id}: unknown collection ${name}`);
  }
  const order = { easy: 0, medium: 1, hard: 2 };
  const ready = problems.filter(problem => problem.meta).sort((a, b) => a.phase.number - b.phase.number || a.meta.lesson.localeCompare(b.meta.lesson) || order[a.meta.difficulty] - order[b.meta.difficulty] || a.id.localeCompare(b.id));
  const tracks = collections.map(item => ({
    ...item,
    href: `${TRACKS}/${item.id}`,
    problems: ready.filter(problem => problem.meta.collections.includes(item.id))
      .sort((a, b) => order[a.meta.difficulty] - order[b.meta.difficulty] || a.phase.number - b.phase.number || a.meta.minutes - b.meta.minutes || a.id.localeCompare(b.id)),
  })).filter(item => item.problems.length);
  return { problems: ready, tracks, errors };
}

function difficultyBadge(difficulty) {
  return `<span class="pr-diff pr-diff-${difficulty}">${DIFFICULTY_LABELS[difficulty]}</span>`;
}

function lessonHref(lesson) {
  return `/lesson?path=${lesson}`;
}

function footer() {
  const links = FOOTER_LINKS.map(([href, label]) => `<a href="${href}">${escapeHtml(label)}</a>`).join('');
  return `<footer class="pr-site-foot"><nav class="footer-links" aria-label="Site">${links}</nav><p>Every problem runs in your browser. Your code and progress stay on this device.</p></footer>`;
}

function shell({ title, description, href, main, bodyClass, jsonLd, robots }, assets) {
  const canonical = ORIGIN + href;
  const image = `${ORIGIN}/og/${CARD}.png`;
  const ld = jsonLd ? `\n<script type="application/ld+json">${jsonForHtml(jsonLd)}</script>` : '';
  const robotsTag = robots ? `\n<meta name="robots" content="${robots}">` : '';
  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<base href="/">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">${robotsTag}
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${image}">
<meta property="og:url" content="${canonical}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="AI Engineering from Scratch">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${image}">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONT_LINK}" rel="stylesheet">
${assets.head}
<script>${THEME_SCRIPT}</script>${ld}
</head>
<body class="${bodyClass}">
<a href="${href}#main" class="skip-link">Skip to content</a>
${SITE_HEADER}
${main}
${footer()}
${assets.body}
</body>
</html>
`;
}

function rowHtml(problem) {
  const { meta, phase } = problem;
  const search = [meta.title, meta.summary, meta.tags.join(' '), problem.lessonTitle, phase.name].join(' ').toLowerCase();
  const tags = meta.tags.map(tag => `<span class="pr-tag">${escapeHtml(tag)}</span>`).join('');
  return `<li class="pr-row" data-id="${meta.id}" data-difficulty="${meta.difficulty}" data-phase="${phase.number}" data-tags="${escapeHtml(meta.tags.join(' '))}" data-tracks="${escapeHtml(meta.collections.join(' '))}" data-search="${escapeHtml(search)}"><span class="pr-status" data-status-for="${meta.id}" aria-label="Not started"></span><div class="pr-row-main"><a class="pr-row-title" href="${problem.href}">${escapeHtml(meta.title)}</a><p class="pr-row-sum">${escapeHtml(meta.summary)}</p><p class="pr-row-tags">${tags}</p></div><div class="pr-row-side">${difficultyBadge(meta.difficulty)}<span class="pr-row-phase">Phase ${String(phase.number).padStart(2, '0')}</span><span class="pr-row-min">${meta.minutes} min</span></div></li>`;
}

function optionList(values, all) {
  return `<option value="">${escapeHtml(all)}</option>${values.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join('')}`;
}

function indexMain(built) {
  const { problems, tracks } = built;
  const phases = Array.from(new Map(problems.map(problem => [problem.phase.number, problem.phase])).values()).sort((a, b) => a.number - b.number);
  const tags = Array.from(new Set(problems.flatMap(problem => problem.meta.tags))).sort();
  const counts = DIFFICULTIES.map(level => [level, problems.filter(problem => problem.meta.difficulty === level).length]);
  const ids = problems.map(problem => problem.id);
  const head = `<header class="pr-index-head"><p class="pr-kicker">AI Engineering from Scratch</p><h1>Practice</h1><p class="pr-lede">Write the code that the lessons build: losses, optimizers, attention, sampling, retrieval and agent parsers. Each problem runs Python with numpy in your browser. The checks tell you what is wrong and why. Each problem links to the lesson that teaches it.</p><dl class="pr-stats" data-practice-stats data-ids="${escapeHtml(ids.join(' '))}"><div><dt>Solved</dt><dd data-stat="solved">0 / ${problems.length}</dd></div><div><dt>Attempted</dt><dd data-stat="attempted">0</dd></div><div><dt>Streak</dt><dd data-stat="streak">0 days</dd></div>${counts.map(([level, count]) => `<div><dt>${DIFFICULTY_LABELS[level]}</dt><dd data-stat="${level}">0 / ${count}</dd></div>`).join('')}</dl><p class="pr-actions"><a class="pr-btn pr-btn-primary" href="${problems[0] ? problems[0].href : BASE}" data-continue hidden>Continue</a><button class="pr-btn" type="button" data-random>Random unsolved</button></p></header>`;
  const filters = `<form class="pr-filters" role="search" data-filters onsubmit="return false"><label class="pr-field pr-field-q"><span>Search</span><input type="search" name="q" autocomplete="off" spellcheck="false" placeholder="attention, adam, bm25"></label><fieldset class="pr-field pr-chips"><legend>Difficulty</legend><label><input type="radio" name="difficulty" value="" checked><span>All</span></label>${DIFFICULTIES.map(level => `<label><input type="radio" name="difficulty" value="${level}"><span>${DIFFICULTY_LABELS[level]}</span></label>`).join('')}</fieldset><label class="pr-field"><span>Status</span><select name="status">${optionList([['unsolved', 'Not solved'], ['attempted', 'Attempted'], ['solved', 'Solved']], 'Any status')}</select></label><label class="pr-field"><span>Phase</span><select name="phase">${optionList(phases.map(phase => [String(phase.number), `Phase ${String(phase.number).padStart(2, '0')}: ${phase.name}`]), 'All phases')}</select></label><label class="pr-field"><span>Track</span><select name="track">${optionList(tracks.map(track => [track.id, track.title]), 'All tracks')}</select></label><label class="pr-field"><span>Tag</span><select name="tag">${optionList(tags.map(tag => [tag, tag]), 'All tags')}</select></label><button class="pr-btn pr-btn-quiet" type="reset">Clear</button></form>`;
  const list = `<section class="pr-section" aria-labelledby="problems"><div class="pr-section-head"><h2 id="problems">Problems</h2><p class="pr-count" aria-live="polite" data-count>${problems.length} problems</p></div><ol class="pr-list" data-list>${problems.map(rowHtml).join('')}</ol><p class="pr-empty" data-empty hidden>No problem matches these filters.</p></section>`;
  const trackCards = tracks.map(track => `<li class="pr-track" data-track="${track.id}" data-ids="${escapeHtml(track.problems.map(problem => problem.id).join(' '))}"><a href="${track.href}"><span class="pr-track-name">${escapeHtml(track.title)}</span><span class="pr-track-sum">${escapeHtml(track.summary)}</span><span class="pr-track-meta"><span data-track-progress>0 / ${track.problems.length} solved</span><span class="pr-meter" aria-hidden="true"><span data-track-meter></span></span></span></a></li>`).join('');
  const trackSection = `<section class="pr-section" aria-labelledby="tracks"><div class="pr-section-head"><h2 id="tracks">Tracks</h2><p class="pr-count">${tracks.length} tracks</p></div><ol class="pr-tracks">${trackCards}</ol></section>`;
  const how = `<section class="pr-section pr-how" aria-labelledby="how"><h2 id="how">How it works</h2><ul><li><strong>Run</strong> checks your code against the examples in the statement.</li><li><strong>Submit</strong> runs every check: the examples, properties that any correct answer has, hidden edge cases and a comparison with the reference solution.</li><li>A failed check shows the expected value, your value and what the check means.</li><li>Hints open one at a time. The solution and the notes open after you pass.</li><li>Python runs in your browser with Pyodide. The first run downloads about 15 MB, then the browser keeps it. Your code and progress stay in this browser. No account is necessary.</li><li>To work offline, clone the repository and run <code>python3 scripts/practice/run.py &lt;id&gt; my_answer.py</code>.</li></ul></section>`;
  return `<main id="main" class="pr-page pr-index" data-practice-index>${head}${filters}${list}${trackSection}${how}</main>`;
}

function trackMain(track, built) {
  const items = track.problems.map((problem, index) => `<li class="pr-track-step" data-id="${problem.id}"><span class="pr-step-n">${String(index + 1).padStart(2, '0')}</span><span class="pr-status" data-status-for="${problem.id}" aria-label="Not started"></span><div class="pr-row-main"><a class="pr-row-title" href="${problem.href}">${escapeHtml(problem.meta.title)}</a><p class="pr-row-sum">${escapeHtml(problem.meta.summary)}</p><p class="pr-row-lesson">From <a href="${lessonHref(problem.meta.lesson)}">${escapeHtml(problem.lessonTitle)}</a></p></div><div class="pr-row-side">${difficultyBadge(problem.meta.difficulty)}<span class="pr-row-min">${problem.meta.minutes} min</span></div></li>`).join('');
  const minutes = track.problems.reduce((sum, problem) => sum + problem.meta.minutes, 0);
  const others = built.tracks.filter(item => item.id !== track.id).map(item => `<a href="${item.href}">${escapeHtml(item.title)}</a>`).join('');
  return `<main id="main" class="pr-page pr-track-page" data-practice-track="${track.id}"><nav class="pr-crumbs" aria-label="Breadcrumb"><ol><li><a href="${BASE}">Practice</a></li><li>Tracks</li><li aria-current="page">${escapeHtml(track.title)}</li></ol></nav><header class="pr-index-head"><p class="pr-kicker">Practice track</p><h1>${escapeHtml(track.title)}</h1><p class="pr-lede">${escapeHtml(track.summary)} ${track.problems.length} problems, about ${minutes} minutes. Do them in order: each problem uses ideas from the problems before it.</p><p class="pr-track-meta pr-track-meta-wide" data-track="${track.id}" data-ids="${escapeHtml(track.problems.map(problem => problem.id).join(' '))}"><span data-track-progress>0 / ${track.problems.length} solved</span><span class="pr-meter" aria-hidden="true"><span data-track-meter></span></span></p></header><ol class="pr-list pr-steps">${items}</ol><nav class="pr-other" aria-label="Other tracks"><span>Other tracks</span>${others}</nav></main>`;
}

function problemMain(problem, built, assets) {
  const { meta, phase } = problem;
  const index = built.problems.indexOf(problem);
  const previous = built.problems[index - 1];
  const next = built.problems[index + 1];
  const tracks = built.tracks.filter(track => meta.collections.includes(track.id));
  const checks = LAYERS.map(layer => problem.checks[layer]).reduce((sum, count) => sum + count, 0);
  const crumbs = `<nav class="pr-crumbs" aria-label="Breadcrumb"><ol><li><a href="${BASE}">Practice</a></li><li><a href="/phase/${phase.slug}">Phase ${String(phase.number).padStart(2, '0')}</a></li><li aria-current="page">${escapeHtml(meta.title)}</li></ol></nav>`;
  const tags = meta.tags.map(tag => `<a class="pr-tag" href="${BASE}?tag=${encodeURIComponent(tag)}">${escapeHtml(tag)}</a>`).join('');
  const links = [`<a href="${lessonHref(meta.lesson)}">Lesson: ${escapeHtml(problem.lessonTitle)}</a>`];
  if (meta.cheatsheet) links.push(`<a href="/cheatsheets/${meta.cheatsheet}">Cheat sheet</a>`);
  for (const track of tracks) links.push(`<a href="${track.href}">Track: ${escapeHtml(track.title)}</a>`);
  const head = `<header class="pr-prob-head">${crumbs}<h1>${escapeHtml(meta.title)}</h1><p class="pr-prob-meta">${difficultyBadge(meta.difficulty)}<span>${meta.minutes} min</span><span>${checks} checks</span><span class="pr-status pr-status-wide" data-status-for="${meta.id}" aria-label="Not started"></span></p><p class="pr-prob-tags">${tags}</p><p class="pr-prob-links">${links.join('')}</p></header>`;
  const statement = `<section class="pr-statement" aria-labelledby="statement"><h2 id="statement" class="pr-visually-hidden">Problem</h2>${problem.statementHtml}</section>`;
  const hints = `<section class="pr-panel pr-hints" aria-labelledby="hints"><div class="pr-panel-head"><h2 id="hints">Hints</h2><span class="pr-panel-count" data-hint-count>${problem.hintsHtml.length} hints</span></div><ol class="pr-hint-list" data-hints></ol><button class="pr-btn" type="button" data-hint-next>Show hint 1 of ${problem.hintsHtml.length}</button></section>`;
  const solution = `<section class="pr-panel pr-solution" aria-labelledby="solution"><div class="pr-panel-head"><h2 id="solution">Solution and notes</h2><span class="pr-lock" data-lock>Locked</span></div><p class="pr-locked-note" data-locked-note>Pass every check with Submit to open the reference solution and the notes.</p><div data-solution hidden></div></section>`;
  const local = `<details class="pr-panel pr-local"><summary>Run it on your computer</summary><p>Clone the repository, install numpy and run the same checks in a terminal:</p><pre><code>python3 scripts/practice/run.py ${meta.id} my_answer.py\npython3 scripts/practice/run.py ${meta.id} my_answer.py --examples</code></pre><p>Start <code>my_answer.py</code> from <a href="${REPO}/blob/main/practice/${meta.id}/starter.py">starter.py</a>.</p></details>`;
  const pager = `<nav class="pr-pager" aria-label="Problem navigation">${previous ? `<a href="${previous.href}" rel="prev">← ${escapeHtml(previous.meta.title)}</a>` : '<span></span>'}<a href="${BASE}">All problems</a>${next ? `<a href="${next.href}" rel="next">${escapeHtml(next.meta.title)} →</a>` : '<span></span>'}</nav>`;
  const shortcuts = '<details class="pr-keys"><summary>Keyboard shortcuts</summary><dl><dt><kbd>Ctrl</kbd> <kbd>Enter</kbd></dt><dd>Run the examples</dd><dt><kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>Enter</kbd></dt><dd>Submit</dd><dt><kbd>Tab</kbd> / <kbd>Shift</kbd> <kbd>Tab</kbd></dt><dd>Indent or outdent the lines</dd><dt><kbd>Esc</kbd> then <kbd>Tab</kbd></dt><dd>Move the focus out of the editor</dd><dt><kbd>Alt</kbd> <kbd>H</kbd></dt><dd>Show the next hint</dd></dl><p>On a Mac, use <kbd>Cmd</kbd> in place of <kbd>Ctrl</kbd>.</p></details>';
  const editor = `<section class="pr-work" aria-labelledby="editor-title"><div class="pr-toolbar"><h2 id="editor-title" class="pr-toolbar-title">Your code</h2><span class="pr-runtime" data-runtime aria-live="polite">Python loads on the first run</span><div class="pr-toolbar-actions"><button class="pr-btn" type="button" data-reset title="Replace your code with the starter">Reset</button><button class="pr-btn" type="button" data-run title="Run the examples (Ctrl Enter)">Run</button><button class="pr-btn pr-btn-primary" type="button" data-submit title="Run every check (Ctrl Shift Enter)">Submit</button></div></div><div class="pr-editor" data-editor><pre class="pr-editor-view" aria-hidden="true"><code data-editor-view></code></pre><textarea class="pr-editor-input" data-editor-input spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-label="Python code editor" aria-describedby="editor-help">${escapeHtml(problem.files['starter.py'])}</textarea></div><p class="pr-editor-help" id="editor-help">Your code is saved in this browser as you type. <span class="pr-mobile-note">On a phone you can read and edit the code, but the checks are easier to use on a desktop.</span></p>${shortcuts}<div class="pr-results" data-results aria-live="polite"><p class="pr-results-empty">Select Run to check the examples, or Submit to run every check.</p></div></section>`;
  const page = `<div class="pr-layout"><div class="pr-left">${statement}${hints}${solution}${local}</div><div class="pr-right">${editor}</div></div>`;
  const data = `${BASE}/data/${meta.id}.json?v=${problem.version}`;
  return `<main id="main" class="pr-page pr-problem" data-practice-problem="${meta.id}" data-version="${problem.version}" data-data="${data}" data-harness="${built.harnessHref}" data-worker="${assets.worker}" data-pyodide="${PYODIDE_BASE}" data-limit="${meta.time_limit_s}" data-hints-total="${problem.hintsHtml.length}">${head}${page}${pager}</main>`;
}

function problemJsonLd(problem) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: problem.meta.title,
    description: problem.meta.summary,
    url: ORIGIN + problem.href,
    learningResourceType: 'Practice problem',
    educationalLevel: DIFFICULTY_LABELS[problem.meta.difficulty],
    timeRequired: `PT${problem.meta.minutes}M`,
    keywords: problem.meta.tags.join(', '),
    inLanguage: 'en',
    isAccessibleForFree: true,
    isBasedOn: { '@type': 'LearningResource', name: problem.lessonTitle, url: `${ORIGIN}${lessonHref(problem.meta.lesson)}` },
    isPartOf: { '@type': 'Course', name: 'AI Engineering from Scratch', url: ORIGIN },
  };
}

function problemData(problem) {
  return {
    id: problem.id,
    version: problem.version,
    title: problem.meta.title,
    entry: problem.meta.entry,
    limit: problem.meta.time_limit_s,
    starter: problem.files['starter.py'],
    tests: problem.files['tests.py'],
    fixtures: problem.files['fixtures.json'],
    hints: problem.hintsHtml,
    layers: problem.checks,
  };
}

function solutionData(problem) {
  return { id: problem.id, version: problem.version, solution: problem.files['solution.py'], notes: problem.notesHtml };
}

function practiceMap(built) {
  const lessons = {};
  for (const problem of built.problems) {
    (lessons[problem.meta.lesson] = lessons[problem.meta.lesson] || []).push({ id: problem.id, title: problem.meta.title, href: problem.href, difficulty: problem.meta.difficulty });
  }
  return { lessons };
}

function buildPractice({ root = REPO_ROOT, siteDir = __dirname } = {}) {
  const built = loadPractice(root);
  if (built.errors.length) throw new Error(`Practice problems have errors. Run python3 scripts/practice/validate.py for the full report.\n${built.errors.join('\n')}`);
  const harness = read(path.join(root, SOURCE_DIR, '_harness', 'practice_check.py'));
  built.harness = harness;
  built.harnessHref = `${BASE}/practice_check.py?v=${sha(harness)}`;
  const worker = `/practice-worker.js?v=${sha(read(path.join(siteDir, 'practice-worker.js')))}`;
  const assets = { head: versionHtml(HEAD_ASSETS, siteDir), body: versionHtml(BODY_ASSETS, siteDir), worker };
  const pages = [{
    file: 'index.html',
    href: BASE,
    html: shell({ title: 'Practice problems - AI Engineering from Scratch', description: `${built.problems.length} practice problems from the course lessons. Write losses, optimizers, attention, sampling and retrieval code, and check it in your browser.`, href: BASE, main: indexMain(built), bodyClass: 'pr-body', jsonLd: { '@context': 'https://schema.org', '@type': 'ItemList', name: 'Practice problems', itemListElement: built.problems.map((problem, index) => ({ '@type': 'ListItem', position: index + 1, url: ORIGIN + problem.href, name: problem.meta.title })) } }, assets),
  }];
  for (const track of built.tracks) {
    pages.push({ file: `tracks/${track.id}.html`, href: track.href, html: shell({ title: `${track.title} practice track - AI Engineering from Scratch`, description: `${track.summary} ${track.problems.length} practice problems that run in your browser.`, href: track.href, main: trackMain(track, built), bodyClass: 'pr-body' }, assets) });
  }
  for (const problem of built.problems) {
    pages.push({ file: `${problem.id}.html`, href: problem.href, html: shell({ title: `${problem.meta.title} - Practice - AI Engineering from Scratch`, description: `${problem.meta.summary} A ${problem.meta.difficulty} practice problem from the lesson ${problem.lessonTitle}.`, href: problem.href, main: problemMain(problem, built, assets), bodyClass: 'pr-body pr-body-problem', jsonLd: problemJsonLd(problem) }, assets) });
  }
  const files = new Map(pages.map(page => [page.file, page.html]));
  files.set('practice_check.py', harness);
  for (const problem of built.problems) {
    files.set(`data/${problem.id}.json`, `${JSON.stringify(problemData(problem))}\n`);
    files.set(`data/${problem.id}.solution.json`, `${JSON.stringify(solutionData(problem))}\n`);
  }
  built.pages = pages;
  built.files = files;
  built.map = practiceMap(built);
  return built;
}

function writePractice({ root = REPO_ROOT, siteDir = __dirname } = {}) {
  const built = buildPractice({ root, siteDir });
  const outDir = path.join(siteDir, OUTPUT_DIR);
  const targets = new Map(Array.from(built.files, ([file, body]) => [path.join(outDir, file), body]));
  if (fs.existsSync(outDir)) {
    const walk = dir => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          if (!fs.readdirSync(full).length) fs.rmdirSync(full);
        } else if (!targets.has(full)) {
          fs.unlinkSync(full);
        }
      }
    };
    walk(outDir);
  }
  for (const [file, body] of targets) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body);
  }
  fs.writeFileSync(path.join(siteDir, 'practice-map.json'), `${JSON.stringify(built.map)}\n`, 'utf8');
  return built;
}

function solutionLines(problem) {
  return problem.files['solution.py'].split('\n').map(line => line.trim()).filter(line => line.length >= 18 && !/^(?:def |import |from |raise NotImplementedError)/.test(line));
}

function checkPractice(built) {
  const problems = [];
  for (const problem of built.problems) {
    const page = built.pages.find(item => item.href === problem.href);
    const starter = new Set(problem.files['starter.py'].split('\n').map(line => line.trim()));
    const lines = solutionLines(problem).filter(line => !starter.has(line));
    for (const line of lines) {
      if (page.html.includes(line) || page.html.includes(escapeHtml(line))) problems.push(`${problem.href}: the page HTML shows a solution line: ${line}`);
    }
    const shipped = [problem.files['tests.py'], problem.files['hints.md']].join('\n').split('\n').map(line => line.trim());
    for (let i = 0; i + 2 < lines.length; i++) {
      const at = shipped.indexOf(lines[i]);
      if (at >= 0 && shipped[at + 1] === lines[i + 1] && shipped[at + 2] === lines[i + 2]) problems.push(`${problem.id}: tests.py or hints.md holds three solution lines in a row: ${lines[i]}`);
    }
    if (problem.notesHtml.length > 40 && page.html.includes(problem.notesHtml)) problems.push(`${problem.href}: the page HTML shows the notes`);
  }
  return problems;
}

function main(argv) {
  if (argv.includes('--check')) {
    const built = buildPractice();
    const second = buildPractice();
    const digest = value => sha(Array.from(value.files).map(([file, body]) => `${file}\n${body}`).join('\n'));
    const problems = checkPractice(built);
    if (digest(built) !== digest(second)) problems.push('two builds of the same input gave different bytes');
    console.log(`Checked ${built.problems.length} practice problems and ${built.tracks.length} tracks.`);
    for (const problem of problems) console.error(`  ${problem}`);
    return problems.length ? 1 : 0;
  }
  const built = writePractice();
  console.log(`Wrote ${built.problems.length} practice problems and ${built.tracks.length} tracks to site/${OUTPUT_DIR}/`);
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { loadPractice, buildPractice, writePractice, checkPractice, practiceMap, hintList, countChecks, PYODIDE_VERSION, PYODIDE_BASE, BASE };
