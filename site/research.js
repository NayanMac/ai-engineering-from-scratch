(function () {
  'use strict';

  function words(value) {
    return String(value || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
  }

  function setup() {
    var box = document.querySelector('.rs-search');
    var input = document.getElementById('rs-q');
    if (!box || !input) return;
    var items = Array.prototype.slice.call(document.querySelectorAll('.rs-method, .rs-task'));
    var areas = Array.prototype.slice.call(document.querySelectorAll('.rs-area'));
    var counter = box.querySelector('.rs-count');
    var empty = document.querySelector('.rs-empty');
    var total = document.querySelectorAll('.rs-method').length;

    function apply() {
      var query = words(input.value);
      var shown = 0;
      items.forEach(function (item) {
        var text = item.getAttribute('data-q') || '';
        var match = query.every(function (word) { return text.indexOf(word) >= 0; });
        item.hidden = !match;
        if (match && item.classList.contains('rs-method')) shown += 1;
      });
      areas.forEach(function (area) {
        area.hidden = !area.querySelector('.rs-method:not([hidden]), .rs-task:not([hidden])');
      });
      if (empty) empty.hidden = !query.length || areas.some(function (area) { return !area.hidden; });
      if (counter) counter.textContent = query.length ? shown + ' of ' + total + ' methods match' : '';
    }

    function sync() {
      try {
        var url = new URL(window.location.href);
        if (input.value.trim()) url.searchParams.set('q', input.value.trim());
        else url.searchParams.delete('q');
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      } catch (_) {}
    }

    try {
      var initial = new URLSearchParams(window.location.search).get('q');
      if (initial) input.value = initial.slice(0, 120);
    } catch (_) {}
    box.hidden = false;
    input.addEventListener('input', function () {
      apply();
      sync();
    });
    apply();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();
