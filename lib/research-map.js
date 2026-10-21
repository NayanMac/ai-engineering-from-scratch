'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const MAP_FILE = 'research/methods.json';
const INDEX_FILE = 'research/paperswithcode-index.json';
const SITE = 'https://paperswithcode.co';
const SITE_NAME = 'paperswithcode.co';
const SLUG = /^[A-Za-z0-9][A-Za-z0-9-]*$/;
const LESSON = /^phases\/[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/;
const TOPIC = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PRACTICE = /^[a-z0-9][a-z0-9-]*$/;
const KINDS = ['lessons', 'topics', 'practice'];
const MAX_METHODS = { lessons: 4, topics: 6, practice: 4 };
const MAX_TASKS = 2;
const MAX_WHY = 120;
const MAX_NAME = 60;

function methodUrl(slug) {
  return `${SITE}/methods/${slug}`;
}

function taskUrl(slug) {
  return `${SITE}/tasks/${slug}`;
}

function readJson(root, file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

function loadMap(root = REPO_ROOT) {
  return readJson(root, MAP_FILE);
}

function loadIndex(root = REPO_ROOT) {
  return readJson(root, INDEX_FILE);
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function practiceExists(root, id) {
  const dir = path.join(root, 'practice');
  if (!fs.existsSync(dir)) return null;
  return fs.readdirSync(dir).some(name => name === id || name.replace(/\.[a-z]+$/, '') === id);
}

function targetProblem(root, kind, id) {
  if (kind === 'lessons') {
    if (!LESSON.test(id)) return 'is not a lesson path such as phases/NN-phase/MM-lesson';
    if (!fs.existsSync(path.join(root, id, 'docs', 'en.md'))) return 'has no docs/en.md';
  } else if (kind === 'topics') {
    if (!TOPIC.test(id)) return 'is not a cheat sheet id';
    if (!fs.existsSync(path.join(root, 'cheatsheets', `${id}.md`))) return `has no cheatsheets/${id}.md`;
  } else if (!PRACTICE.test(id)) {
    return 'is not a practice id';
  } else if (practiceExists(root, id) === false) {
    return 'is not in the practice folder';
  }
  return '';
}

function validate(map, index, root = REPO_ROOT) {
  const problems = [];
  const add = message => problems.push(message);
  if (!isObject(map)) return ['the map must be a JSON object'];
  if (map.version !== 1) add('version must be 1');
  if (map.site !== SITE) add(`site must be ${SITE}`);
  const known = {
    methods: new Set(Array.isArray(index && index.methods) ? index.methods : []),
    tasks: new Set(Array.isArray(index && index.tasks) ? index.tasks : []),
  };
  if (!known.methods.size) add(`${INDEX_FILE} has no method slugs`);
  for (const group of ['methods', 'tasks']) {
    if (!isObject(map[group])) {
      add(`${group} must be an object of slug to display name`);
      continue;
    }
    for (const [slug, name] of Object.entries(map[group])) {
      if (!SLUG.test(slug)) add(`${group}: "${slug}" is not a slug`);
      else if (known[group].size && !known[group].has(slug)) add(`${group}: "${slug}" is not in the ${SITE_NAME} sitemap`);
      if (typeof name !== 'string' || !name.trim() || name.length > MAX_NAME) add(`${group}: "${slug}" needs a display name of 1 to ${MAX_NAME} characters`);
    }
  }
  const used = { methods: new Set(), tasks: new Set() };
  for (const kind of KINDS) {
    if (!isObject(map[kind])) {
      add(`${kind} must be an object`);
      continue;
    }
    for (const [id, entry] of Object.entries(map[kind])) {
      const where = `${kind}["${id}"]`;
      const problem = targetProblem(root, kind, id);
      if (problem) add(`${where} ${problem}`);
      if (!isObject(entry)) {
        add(`${where} must be an object`);
        continue;
      }
      const methods = Array.isArray(entry.methods) ? entry.methods : null;
      const tasks = entry.tasks === undefined ? [] : entry.tasks;
      if (!methods) add(`${where}.methods must be a list`);
      if (!Array.isArray(tasks)) add(`${where}.tasks must be a list`);
      if (methods && !methods.length && !(Array.isArray(tasks) && tasks.length)) add(`${where} maps nothing; remove it`);
      if (methods && methods.length > MAX_METHODS[kind]) add(`${where} has ${methods.length} methods; the limit is ${MAX_METHODS[kind]}`);
      if (Array.isArray(tasks) && tasks.length > MAX_TASKS) add(`${where} has ${tasks.length} tasks; the limit is ${MAX_TASKS}`);
      const seen = new Set();
      for (const item of methods || []) {
        if (!isObject(item) || typeof item.slug !== 'string') {
          add(`${where}.methods has an item without a slug`);
          continue;
        }
        if (seen.has(item.slug)) add(`${where} lists ${item.slug} twice`);
        seen.add(item.slug);
        used.methods.add(item.slug);
        if (!isObject(map.methods) || !Object.prototype.hasOwnProperty.call(map.methods, item.slug)) add(`${where}: method "${item.slug}" has no entry in methods`);
        if (typeof item.why !== 'string' || !item.why.trim()) add(`${where}: method "${item.slug}" needs a why`);
        else if (item.why.length > MAX_WHY) add(`${where}: the why for "${item.slug}" has ${item.why.length} characters; the limit is ${MAX_WHY}`);
      }
      for (const slug of Array.isArray(tasks) ? tasks : []) {
        if (typeof slug !== 'string') {
          add(`${where}.tasks has an item that is not a slug`);
          continue;
        }
        used.tasks.add(slug);
        if (!isObject(map.tasks) || !Object.prototype.hasOwnProperty.call(map.tasks, slug)) add(`${where}: task "${slug}" has no entry in tasks`);
      }
    }
  }
  for (const group of ['methods', 'tasks']) {
    for (const slug of Object.keys(isObject(map[group]) ? map[group] : {})) {
      if (!used[group].has(slug)) add(`${group}: "${slug}" is not used by any lesson, topic or practice problem`);
    }
  }
  return problems;
}

function vanished(map, index) {
  const methods = new Set(index.methods);
  const tasks = new Set(index.tasks);
  return {
    methods: Object.keys(map.methods || {}).filter(slug => !methods.has(slug)).sort(),
    tasks: Object.keys(map.tasks || {}).filter(slug => !tasks.has(slug)).sort(),
  };
}

function prune(map, gone) {
  const methods = new Set(gone.methods);
  const tasks = new Set(gone.tasks);
  const next = JSON.parse(JSON.stringify(map));
  for (const slug of methods) delete next.methods[slug];
  for (const slug of tasks) delete next.tasks[slug];
  for (const kind of KINDS) {
    for (const [id, entry] of Object.entries(next[kind] || {})) {
      entry.methods = (entry.methods || []).filter(item => !methods.has(item.slug));
      if (entry.tasks) entry.tasks = entry.tasks.filter(slug => !tasks.has(slug));
      if (entry.tasks && !entry.tasks.length) delete entry.tasks;
      if (!entry.methods.length && !(entry.tasks && entry.tasks.length)) delete next[kind][id];
    }
  }
  return next;
}

function linksFor(map, entry) {
  return {
    methods: (entry.methods || []).map(item => ({ slug: item.slug, name: map.methods[item.slug], why: item.why, href: methodUrl(item.slug) })),
    tasks: (entry.tasks || []).map(slug => ({ slug, name: map.tasks[slug], href: taskUrl(slug) })),
  };
}

function siteMap(map) {
  const out = {};
  for (const kind of ['lessons', 'topics']) {
    out[kind] = {};
    for (const [id, entry] of Object.entries(map[kind] || {}).sort(([a], [b]) => a.localeCompare(b, 'en'))) {
      const links = linksFor(map, entry);
      out[kind][id] = {
        methods: links.methods.map(({ slug, name }) => ({ slug, name })),
        tasks: links.tasks.map(({ slug, name }) => ({ slug, name })),
      };
    }
  }
  return out;
}

function stringify(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

module.exports = {
  INDEX_FILE,
  KINDS,
  MAP_FILE,
  SITE,
  SITE_NAME,
  SLUG,
  linksFor,
  loadIndex,
  loadMap,
  methodUrl,
  prune,
  siteMap,
  stringify,
  taskUrl,
  validate,
  vanished,
};
