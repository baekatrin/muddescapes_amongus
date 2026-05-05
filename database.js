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
    rowCount: null
  };

  /**
   * Target row must match EVERY field incl. clearance code from sheet (Kelly / Electrical /
   * Rederin / 1:14 AM → code 1221). Extra guard so mis-shifted CSV columns cannot “win”.
   */
  var CORRECT_IMPOSTER_SPEC = {
    name: 'kelly',
    place: 'electrical',
    species: 'rederin',
    timeCanon: '1:14am',
    clearanceCode: '1221'
  };

  function normField(s) {
    return String(s || '').trim().toLowerCase();
  }

  function canonTimeFromRow(t) {
    if (t == null || t === '') return '';
    var s = String(t).toLowerCase().trim();
    s = s.replace(/[\s\u00a0\u2000-\u200b\u2028\u2029\u202f\u3000]+/g, '');
    s = s.replace(/(\d{1,2}:\d{2}):00([ap]m)$/i, '$1$2');
    s = s.replace(/^0(\d:\d{2})/, '$1');
    return s;
  }

  function normCodeDigits(s) {
    return String(s != null ? s : '').trim().replace(/^["']+|["']+$/g, '');
  }

  function isCorrectImposterEntry(entry) {
    if (!entry) return false;
    if (normField(entry.name) !== CORRECT_IMPOSTER_SPEC.name) return false;
    if (normField(entry.place) !== CORRECT_IMPOSTER_SPEC.place) return false;
    if (normField(entry.species) !== CORRECT_IMPOSTER_SPEC.species) return false;
    if (canonTimeFromRow(entry.time) !== CORRECT_IMPOSTER_SPEC.timeCanon) return false;
    return normCodeDigits(entry.code) === CORRECT_IMPOSTER_SPEC.clearanceCode;
  }

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
    dom.rowCount = document.getElementById('row-count');
  }

  var CSV_URL = 'MuddEscapes Amongus Data - Sheet1.csv';

  /** Trim surrounding quotes / spaces from naive CSV split tokens. */
  function cleanCsvToken(raw) {
    var s = (raw !== undefined && raw !== null ? String(raw) : '').trim();
    if ((s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') ||
        (s.charAt(0) === "'" && s.charAt(s.length - 1) === "'")) {
      s = s.slice(1, -1).replace(/""/g, '"').trim();
    }
    return s;
  }

  function parseCsv(text) {
    text = text.replace(/^\uFEFF/, '');
    var lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    var header = lines[0].split(',').map(function (h) { return cleanCsvToken(h).toLowerCase(); });
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
      var partsRaw = line.split(',');
      if (partsRaw.length < 5) continue;
      var parts = partsRaw.map(cleanCsvToken);
      var codeVal = parts.slice(iCode).join(',').trim();
      rows.push({
        name: parts[iName] || '',
        place: parts[iPlace] || '',
        time: parts[iTime] || '',
        species: parts[iSpecies] || '',
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

    var reveal = document.getElementById('code-reveal');
    var heading = document.getElementById('reveal-heading');
    var codeSection = document.getElementById('reveal-code-section');
    var codeValueEl = document.getElementById('code-value');

    var rows = state.filteredEntries;
    dom.tableBody.innerHTML = '';

    rows.forEach(function (entry) {
      var showCodeInTable = rows.length === 1 && isCorrectImposterEntry(entry);
      var tr = document.createElement('tr');
      ['name', 'place', 'time', 'species'].forEach(function (key) {
        var td = document.createElement('td');
        td.textContent = entry[key] != null ? String(entry[key]) : '';
        tr.appendChild(td);
      });
      var tdCode = document.createElement('td');
      tdCode.className = 'code-cell';
      if (rows.length === 1 && !showCodeInTable) {
        tdCode.classList.add('code-cell--masked');
      }
      tdCode.textContent = showCodeInTable ? normCodeDigits(entry.code) : '\u2014';
      tr.appendChild(tdCode);
      dom.tableBody.appendChild(tr);
    });

    if (reveal && heading && codeSection && codeValueEl) {
      reveal.classList.remove('code-reveal--success', 'code-reveal--failure', 'is-open');
      reveal.removeAttribute('data-result');
      heading.textContent = '';
      codeValueEl.textContent = '';
      codeSection.classList.add('is-withheld');
      codeSection.setAttribute('aria-hidden', 'true');
      codeSection.hidden = true;

      if (rows.length === 1) {
        var ok = isCorrectImposterEntry(rows[0]);
        reveal.classList.add('is-open');
        reveal.classList.add(ok ? 'code-reveal--success' : 'code-reveal--failure');
        reveal.setAttribute('data-result', ok ? 'correct' : 'wrong');
        heading.textContent = ok
          ? 'YOU CAUGHT THE IMPOSTER!'
          : 'WRONG! This is not the imposter!';
        if (ok && normCodeDigits(rows[0].code)) {
          codeSection.classList.remove('is-withheld');
          codeSection.hidden = false;
          codeSection.removeAttribute('hidden');
          codeSection.setAttribute('aria-hidden', 'false');
          codeValueEl.textContent = normCodeDigits(rows[0].code);
        }
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
