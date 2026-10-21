const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const practice = require('./build-practice');

const root = path.resolve(__dirname, '..');
const built = practice.buildPractice();
const config = require('../vercel.json');

function page(href) {
  return built.pages.find(item => item.href === href);
}

test('every problem folder builds a page, a run file and a solution file', () => {
  assert.ok(built.problems.length >= 25, `only ${built.problems.length} problems`);
  for (const problem of built.problems) {
    assert.ok(page(problem.href), `${problem.id} has no page`);
    assert.ok(built.files.has(`data/${problem.id}.json`));
    assert.ok(built.files.has(`data/${problem.id}.solution.json`));
    const data = JSON.parse(built.files.get(`data/${problem.id}.json`));
    assert.equal(data.version, problem.version);
    assert.ok(data.hints.length >= 2 && data.hints.length <= 5);
    assert.ok(data.tests.includes('from practice_check import'));
    assert.deepEqual(Object.keys(JSON.parse(data.fixtures)).length > 0, true);
    assert.equal('solution' in data, false);
  }
});

test('no page and no run file shows the solution or the notes', () => {
  assert.deepEqual(practice.checkPractice(built), []);
  for (const problem of built.problems) {
    const html = page(problem.href).html;
    const solution = JSON.parse(built.files.get(`data/${problem.id}.solution.json`));
    assert.equal(html.includes(problem.files['solution.py'].trim()), false);
    assert.equal(html.includes('.solution.json'), false);
    assert.ok(solution.solution.length > 0 && solution.notes.length > 0);
  }
});

test('a problem page holds the statement, the starter, the source lesson and its links', () => {
  for (const problem of built.problems) {
    const html = page(problem.href).html;
    assert.match(html, new RegExp(`<link rel="canonical" href="https://aiengineeringfromscratch.com/practice/${problem.id}">`));
    assert.match(html, /<h2 id="task"/);
    assert.match(html, /data-editor-input/);
    assert.ok(html.includes(`/lesson?path=${problem.meta.lesson}`), `${problem.id} does not link its lesson`);
    if (problem.meta.cheatsheet) assert.ok(html.includes(`/cheatsheets/${problem.meta.cheatsheet}`));
    assert.match(html, /"@type":"LearningResource"/);
    assert.match(html, /data-pyodide="https:\/\/cdn\.jsdelivr\.net\/pyodide\/v314\.0\.7\/full\/"/);
    assert.match(html, /data-worker="\/practice-worker\.js\?v=[0-9a-f]{16}"/);
    assert.match(html, /\/practice\.js\?v=[0-9a-f]{16}/);
    assert.equal(/<script[^>]+pyodide/i.test(html), false, 'Pyodide must load only when the learner runs code');
  }
});

test('the list page has a row for each problem with the filter data', () => {
  const html = page('/practice').html;
  for (const problem of built.problems) {
    assert.ok(html.includes(`data-id="${problem.id}" data-difficulty="${problem.meta.difficulty}" data-phase="${problem.phase.number}"`), problem.id);
  }
  for (const name of ['q', 'difficulty', 'status', 'phase', 'track', 'tag']) assert.match(html, new RegExp(`name="${name}"`));
  assert.match(html, /data-random/);
  assert.match(html, /data-continue/);
  assert.match(html, /"@type":"ItemList"/);
});

test('tracks come from problem metadata and each track page lists its problems in order', () => {
  const ids = JSON.parse(fs.readFileSync(path.join(root, 'practice', 'collections.json'), 'utf8')).map(item => item.id);
  assert.ok(built.tracks.length >= 6);
  for (const track of built.tracks) {
    assert.ok(ids.includes(track.id));
    const html = page(track.href).html;
    let last = -1;
    for (const problem of track.problems) {
      assert.ok(problem.meta.collections.includes(track.id));
      const at = html.indexOf(`data-id="${problem.id}"`);
      assert.ok(at > last, `${track.id} order`);
      last = at;
    }
  }
});

test('the lesson map lists the practice problems of each lesson', () => {
  for (const problem of built.problems) {
    const items = built.map.lessons[problem.meta.lesson];
    assert.ok(items.some(item => item.id === problem.id && item.href === problem.href));
  }
});

test('the harness and each problem have the files that the validator needs', () => {
  assert.ok(built.files.get('practice_check.py').includes('def evaluate_json('));
  for (const problem of built.problems) {
    for (const name of ['problem.md', 'starter.py', 'solution.py', 'tests.py', 'hints.md', 'notes.md', 'fixtures.json']) {
      assert.ok(fs.existsSync(path.join(root, 'practice', problem.id, name)), `${problem.id}/${name}`);
    }
    const counts = practice.countChecks(problem.files['tests.py']);
    for (const layer of ['examples', 'properties', 'edge', 'reference']) assert.ok(counts[layer] > 0, `${problem.id} has no ${layer} check`);
  }
});

test('a broken problem folder stops the build with a clear message', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'aiefs-practice-'));
  try {
    fs.mkdirSync(path.join(temp, 'practice', '_harness'), { recursive: true });
    fs.writeFileSync(path.join(temp, 'practice', '_harness', 'practice_check.py'), 'def evaluate_json(): pass\n');
    fs.writeFileSync(path.join(temp, 'practice', 'collections.json'), '[]');
    fs.mkdirSync(path.join(temp, 'practice', 'demo'));
    fs.writeFileSync(path.join(temp, 'practice', 'demo', 'meta.json'), '{"id": "demo"}');
    assert.throws(() => practice.buildPractice({ root: temp }), /demo: missing problem\.md/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('hints split on level 2 headings', () => {
  assert.deepEqual(practice.hintList('## Hint 1\n\nOne.\n\n## Hint 2\n\nTwo.\n'), ['One.', 'Two.']);
});

test('two builds give the same bytes', () => {
  const again = practice.buildPractice();
  assert.deepEqual(Array.from(again.files.keys()), Array.from(built.files.keys()));
  for (const [file, body] of built.files) assert.equal(again.files.get(file), body, file);
});

test('clean URLs route to the practice pages and the run data is not indexed', () => {
  const rewrites = config.rewrites.map(rule => `${rule.source} ${rule.destination}`);
  assert.ok(rewrites.includes('/practice /practice/index.html'));
  assert.ok(rewrites.includes('/practice/:problem([a-z0-9-]+) /practice/:problem.html'));
  assert.ok(rewrites.includes('/practice/tracks/:track([a-z0-9-]+) /practice/tracks/:track.html'));
  const data = config.headers.find(rule => rule.source === '/practice/data/:path*');
  assert.ok(data.headers.some(header => header.key === 'X-Robots-Tag' && header.value === 'noindex'));
  assert.ok(config.functions['api/lesson.js'].includeFiles.includes('site/practice-map.json'));
});

test('the menu, the footers and the hub pages link to the practice pages', () => {
  assert.match(fs.readFileSync(path.join(__dirname, 'header.js'), 'utf8'), /ensureNavigationLink\(nav, '\/practice', 'Practice', ''\)/);
  assert.match(fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8'), /<a href="\/practice">Practice<\/a>/);
  assert.match(fs.readFileSync(path.join(__dirname, 'build-hubs.js'), 'utf8'), /\['\/practice', 'Practice'\]/);
});

test('the worker loads Pyodide as a module from the pinned version', () => {
  const worker = fs.readFileSync(path.join(__dirname, 'practice-worker.js'), 'utf8');
  assert.match(worker, /import\(indexURL \+ 'pyodide\.mjs'\)/);
  assert.equal(/importScripts/.test(worker), false);
  assert.match(fs.readFileSync(path.join(__dirname, 'practice.js'), 'utf8'), /new Worker\(workerUrl, \{ type: 'module' \}\)/);
  assert.equal(practice.PYODIDE_VERSION, '314.0.7');
});
