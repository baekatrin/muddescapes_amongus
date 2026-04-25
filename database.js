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
    codeValue: null,
    rowCount: null
  };

  var STORAGE_PREFIX = 'me_db_filter_';

  function persistFilters() {
    try {
      if (dom.filterName) sessionStorage.setItem(STORAGE_PREFIX + 'name', dom.filterName.value);
      if (dom.filterPlace) sessionStorage.setItem(STORAGE_PREFIX + 'place', dom.filterPlace.value);
      if (dom.filterTime) sessionStorage.setItem(STORAGE_PREFIX + 'time', dom.filterTime.value);
      if (dom.filterSpecies) sessionStorage.setItem(STORAGE_PREFIX + 'species', dom.filterSpecies.value);
    } catch (e) { /* private mode / quota */ }
  }

  function restoreFilters() {
    try {
      var n = sessionStorage.getItem(STORAGE_PREFIX + 'name');
      var p = sessionStorage.getItem(STORAGE_PREFIX + 'place');
      var t = sessionStorage.getItem(STORAGE_PREFIX + 'time');
      var s = sessionStorage.getItem(STORAGE_PREFIX + 'species');
      if (n !== null && dom.filterName) dom.filterName.value = n;
      if (p !== null && dom.filterPlace) dom.filterPlace.value = p;
      if (t !== null && dom.filterTime) dom.filterTime.value = t;
      if (s !== null && dom.filterSpecies) dom.filterSpecies.value = s;
    } catch (e) { /* */ }
  }

  function init() {
    cacheDoms();
    restoreFilters();
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
    dom.rowCount = document.getElementById('row-count');
  }

  var CSV_URL = 'MuddEscapes Amongus Data - Sheet1.csv';

  function parseCsv(text) {
    text = text.replace(/^\uFEFF/, '');
    var lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    var header = lines[0].split(',').map(function (h) { return h.trim().toLowerCase(); });
    var iName = header.indexOf('name');
    var iPlace = header.indexOf('place');
    var iTime = header.indexOf('time');
    var iSpecies = header.indexOf('species');
    var iCode = header.indexOf('code');
    if (iName < 0 || iPlace < 0 || iTime < 0 || iSpecies < 0 || iCode < 0) return [];
    var rows = [];
    for (var i = 1; i < lines.length; i++) {
      var line = lines[i];
      if (!line.trim()) continue;
      var parts = line.split(',');
      if (parts.length < 5) continue;
      var codeVal = parts.slice(iCode).join(',').trim();
      rows.push({
        name: (parts[iName] || '').trim(),
        place: (parts[iPlace] || '').trim(),
        time: (parts[iTime] || '').trim(),
        species: (parts[iSpecies] || '').trim(),
        code: codeVal
      });
    }
    return rows;
  }

  function applyEntries(data) {
    state.entries = data;
    filterAndRender();
  }

  function tryEmbeddedRecords() {
    if (typeof window.__DB_RECORDS__ !== 'undefined' &&
        Array.isArray(window.__DB_RECORDS__) &&
        window.__DB_RECORDS__.length > 0) {
      applyEntries(window.__DB_RECORDS__.slice());
      return true;
    }
    return false;
  }

  function fetchEntries() {
    fetch(encodeURI(CSV_URL))
      .then(function (r) {
        if (!r.ok) throw new Error('csv');
        return r.text();
      })
      .then(function (text) {
        var parsed = parseCsv(text);
        if (!parsed.length) throw new Error('empty');
        applyEntries(parsed);
      })
      .catch(function () {
        if (tryEmbeddedRecords()) return;
        fetch('data/entries.json')
          .then(function (r) {
            if (!r.ok) throw new Error('json');
            return r.json();
          })
          .then(function (data) {
            var list = Array.isArray(data) ? data : (data.entries || []);
            if (list.length) {
              applyEntries(list);
            } else if (!tryEmbeddedRecords()) {
              state.entries = [];
              state.filteredEntries = [];
              renderTable();
            }
          })
          .catch(function () {
            if (!tryEmbeddedRecords()) {
              state.entries = [];
              state.filteredEntries = [];
              renderTable();
            }
          });
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
    persistFilters();
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

    if (dom.rowCount) {
      var n = rows.length;
      var total = state.entries.length;
      dom.rowCount.textContent = n === total
        ? 'Showing all ' + n + ' rows.'
        : 'Showing ' + n + ' of ' + total + ' rows (filters applied).';
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
