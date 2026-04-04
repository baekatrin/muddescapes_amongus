(function () {
  'use strict';

  const state = {
    entries: [],
    filteredEntries: []
  };

  const dom = {
    filterName: null,
    filterPlace: null,
    filterTime: null,
    filterSpecies: null,
    tableBody: null,
    codeReveal: null,
    codeValue: null
  };

  function init() {
    cacheDoms();
    fetchEntries();
    bindFilters();
  }

  function cacheDoms() {
    dom.filterName = document.getElementById('filter-name');
    dom.filterPlace = document.getElementById('filter-place');
    dom.filterTime = document.getElementById('filter-time');
    dom.filterSpecies = document.getElementById('filter-species');
    dom.tableBody = document.getElementById('table-body');
    dom.codeReveal = document.getElementById('code-reveal');
    dom.codeValue = document.getElementById('code-value');
  }

  function fetchEntries() {
    fetch('data/entries.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state.entries = Array.isArray(data) ? data : (data.entries || []);
        state.filteredEntries = state.entries.slice();
        renderTable();
      })
      .catch(function () {
        state.entries = [];
        state.filteredEntries = [];
        renderTable();
      });
  }

  function bindFilters() {
    [dom.filterName, dom.filterPlace, dom.filterTime, dom.filterSpecies].forEach(function (input) {
      if (input) {
        input.addEventListener('input', filterAndRender);
        input.addEventListener('change', filterAndRender);
      }
    });
  }

  function filterAndRender() {
    const name = (dom.filterName && dom.filterName.value) || '';
    const place = (dom.filterPlace && dom.filterPlace.value) || '';
    const time = (dom.filterTime && dom.filterTime.value) || '';
    const species = (dom.filterSpecies && dom.filterSpecies.value) || '';
    const n = name.trim().toLowerCase();
    const p = place.trim().toLowerCase();
    const t = time.trim().toLowerCase();
    const s = species.trim().toLowerCase();

    state.filteredEntries = state.entries.filter(function (row) {
      return (!n || (row.name || '').toLowerCase().includes(n)) &&
             (!p || (row.place || '').toLowerCase().includes(p)) &&
             (!t || (row.time || '').toLowerCase().includes(t)) &&
             (!s || (row.species || '').toLowerCase().includes(s));
    });
    renderTable();
  }

  function renderTable() {
    if (!dom.tableBody) return;
    const rows = state.filteredEntries;
    dom.tableBody.innerHTML = '';
    rows.forEach(function (entry) {
      const tr = document.createElement('tr');
      const showCode = rows.length === 1;
      const code = showCode ? (entry.code || '') : '';
      tr.innerHTML =
        '<td>' + escapeHtml(entry.name || '') + '</td>' +
        '<td>' + escapeHtml(entry.place || '') + '</td>' +
        '<td>' + escapeHtml(entry.time || '') + '</td>' +
        '<td>' + escapeHtml(entry.species || '') + '</td>' +
        '<td class="code-cell">' + (showCode ? escapeHtml(code) : '—') + '</td>';
      dom.tableBody.appendChild(tr);
    });

    if (dom.codeReveal && dom.codeValue) {
      if (rows.length === 1 && rows[0].code) {
        dom.codeReveal.hidden = false;
        dom.codeValue.textContent = rows[0].code;
      } else {
        dom.codeReveal.hidden = true;
        dom.codeValue.textContent = '';
      }
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
