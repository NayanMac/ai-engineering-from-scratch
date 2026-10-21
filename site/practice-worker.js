var runtime = null;
var harness = { href: '', text: '' };
var DIR = '/home/pyodide/practice';

function post(message) {
  self.postMessage(message);
}

function boot(indexURL) {
  if (runtime) return runtime;
  var started = Date.now();
  runtime = import(indexURL + 'pyodide.mjs').catch(function (error) {
    throw new Error('The Python runtime did not download. Check the network connection and try again. ' + (error && error.message || ''));
  }).then(function (module) {
    post({ type: 'status', phase: 'runtime' });
    return module.loadPyodide({ indexURL: indexURL });
  }).then(function (pyodide) {
    var runtimeMs = Date.now() - started;
    post({ type: 'status', phase: 'numpy', ms: runtimeMs });
    return pyodide.loadPackage('numpy').then(function () {
      pyodide.FS.mkdirTree(DIR);
      pyodide.runPython('import sys\nsys.path.insert(0, "' + DIR + '")\nimport numpy');
      post({ type: 'status', phase: 'ready', ms: Date.now() - started, runtimeMs: runtimeMs });
      return pyodide;
    });
  });
  runtime.catch(function () { runtime = null; });
  return runtime;
}

function fetchText(href) {
  return fetch(href, { credentials: 'same-origin' }).then(function (response) {
    if (!response.ok) throw new Error('Could not load ' + href + ' (' + response.status + ')');
    return response.text();
  });
}

function loadHarness(href) {
  if (harness.href === href && harness.text) return Promise.resolve(harness.text);
  return fetchText(href).then(function (text) {
    harness = { href: href, text: text };
    return text;
  });
}

function run(message) {
  var started = Date.now();
  return boot(message.pyodide).then(function (pyodide) {
    return loadHarness(message.harness).then(function (harnessText) {
      var fs = pyodide.FS;
      fs.writeFile(DIR + '/practice_check.py', harnessText);
      fs.writeFile(DIR + '/practice_tests.py', message.tests);
      pyodide.globals.set('practice_source', message.code);
      pyodide.globals.set('practice_fixtures', message.fixtures || '');
      pyodide.globals.set('practice_layers', (message.layers || []).join(','));
      pyodide.globals.set('practice_limit', Number(message.limit) || 0);
      var text = pyodide.runPython([
        'import sys',
        'for _name in ("practice_check", "practice_tests", "submission"):',
        '    sys.modules.pop(_name, None)',
        'import practice_check',
        'practice_check.evaluate_json(practice_source, "' + DIR + '/practice_tests.py", practice_fixtures, practice_layers, practice_limit)'
      ].join('\n'));
      var report = JSON.parse(text.replace(/\bNaN\b/g, 'null').replace(/-?\bInfinity\b/g, 'null'));
      report.ms = Date.now() - started;
      return report;
    });
  });
}

self.onmessage = function (event) {
  var message = event.data || {};
  if (message.type === 'boot') {
    boot(message.pyodide).then(function () {}, function (error) {
      post({ type: 'error', id: message.id, message: String(error && error.message || error) });
    });
    return;
  }
  if (message.type !== 'run') return;
  run(message).then(function (report) {
    post({ type: 'result', id: message.id, report: report });
  }, function (error) {
    post({ type: 'error', id: message.id, message: String(error && error.message || error) });
  });
};
