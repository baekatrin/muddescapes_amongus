(function () {
  'use strict';

  const PHYSICAL_SECRET = 'UNLOCK';
  const CORRECT_DATETIME = 'correct';
  const KNOB_VOLUME_GOAL_MIN = 0.4;
  const KNOB_VOLUME_GOAL_MAX = 0.8;
  const KNOB_BRIGHTNESS_GOAL_MIN = 45;
  const KNOB_BRIGHTNESS_GOAL_MAX = 75;

  const state = {
    tasks: {
      dateTime: false,
      knobs: false,
      physical: false
    },
    knobVolume: 0,
    knobBrightness: 50
  };

  const dom = {
    videoWrapper: null,
    video: null,
    datetimeSelect: null,
    knobVolume: null,
    knobBrightness: null,
    progressSegments: null,
    progressHint: null
  };

  function init() {
    cacheDoms();
    loadStateFromStorage();
    checkPhysicalFromUrl();
    bindCctv();
    updateProgressBar();
    updateVideoBlur();
    updateVideoFilter();
    persistState();
  }

  function cacheDoms() {
    dom.videoWrapper = document.getElementById('video-wrapper');
    dom.video = document.getElementById('cctv-video');
    dom.datetimeSelect = document.getElementById('datetime-select');
    dom.knobVolume = document.getElementById('knob-volume');
    dom.knobBrightness = document.getElementById('knob-brightness');
    dom.progressSegments = document.querySelectorAll('.progress-segment');
    dom.progressHint = document.getElementById('progress-hint');
  }

  function loadStateFromStorage() {
    try {
      const saved = localStorage.getItem('escapeRoomState');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tasks) state.tasks = parsed.tasks;
        if (typeof parsed.knobVolume === 'number') state.knobVolume = parsed.knobVolume;
        if (typeof parsed.knobBrightness === 'number') state.knobBrightness = parsed.knobBrightness;
        if (parsed.datetimeValue && dom.datetimeSelect) {
          const opt = dom.datetimeSelect.querySelector('option[value="' + parsed.datetimeValue + '"]');
          if (opt) dom.datetimeSelect.value = parsed.datetimeValue;
        }
      }
    } catch (_) {}
  }

  function persistState() {
    try {
      localStorage.setItem('escapeRoomState', JSON.stringify({
        tasks: state.tasks,
        knobVolume: state.knobVolume,
        knobBrightness: state.knobBrightness,
        datetimeValue: dom.datetimeSelect ? dom.datetimeSelect.value : ''
      }));
    } catch (_) {}
  }

  function checkPhysicalFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('physical') === PHYSICAL_SECRET) {
      state.tasks.physical = true;
    }
  }

  function bindCctv() {
    if (dom.datetimeSelect) {
      dom.datetimeSelect.addEventListener('change', function () {
        state.tasks.dateTime = dom.datetimeSelect.value === CORRECT_DATETIME;
        updateProgressBar();
        updateVideoBlur();
        persistState();
      });
    }

    if (dom.video) dom.video.volume = state.knobVolume;

    initKnob(dom.knobVolume, state.knobVolume * 100, function (value) {
      state.knobVolume = value / 100;
      if (dom.video) dom.video.volume = state.knobVolume;
      state.tasks.knobs = checkKnobsDone();
      updateProgressBar();
      persistState();
    });
    initKnob(dom.knobBrightness, state.knobBrightness, function (value) {
      state.knobBrightness = value;
      state.tasks.knobs = checkKnobsDone();
      updateVideoFilter();
      updateProgressBar();
      persistState();
    });

    state.tasks.knobs = checkKnobsDone();
    updateVideoFilter();
  }

  function checkKnobsDone() {
    const volOk = state.knobVolume >= KNOB_VOLUME_GOAL_MIN && state.knobVolume <= KNOB_VOLUME_GOAL_MAX;
    const brightOk = state.knobBrightness >= KNOB_BRIGHTNESS_GOAL_MIN && state.knobBrightness <= KNOB_BRIGHTNESS_GOAL_MAX;
    return volOk && brightOk;
  }

  function updateVideoFilter() {
    if (!dom.video) return;
    const b = state.knobBrightness;
    const contrast = 100 + (b - 50) * 0.5;
    const base = 'sepia(0.1) hue-rotate(60deg) saturate(0.7)';
    const blur = state.tasks.physical ? '' : ' blur(8px)';
    dom.video.style.filter = base + ' brightness(' + (b / 50) + ') contrast(' + contrast + '%)' + blur;
  }

  function initKnob(el, initialValue, onChange) {
    if (!el) return;
    let value = Math.max(0, Math.min(100, initialValue));
    let startY = 0;
    let startValue = 0;

    function setValue(v) {
      value = Math.max(0, Math.min(100, v));
      const deg = -130 + (value / 100) * 260;
      el.style.setProperty('--knob-rotation', deg + 'deg');
      el.setAttribute('aria-valuenow', Math.round(value));
      onChange(value);
    }

    el.style.setProperty('--knob-rotation', (-130 + (value / 100) * 260) + 'deg');

    el.addEventListener('mousedown', function (e) {
      e.preventDefault();
      startY = e.clientY;
      startValue = value;
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
      setValue(startValue + (startY - e.clientY) * 0.5);
    }
    function onMouseUp() {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    el.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        e.preventDefault();
        setValue(value + 5);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setValue(value - 5);
      }
    });
  }

  function updateVideoBlur() {
    if (!dom.videoWrapper) return;
    dom.videoWrapper.classList.toggle('blurred', !state.tasks.physical);
  }

  function updateProgressBar() {
    const done = [state.tasks.dateTime, state.tasks.knobs, state.tasks.physical];
    if (dom.progressSegments) {
      dom.progressSegments.forEach(function (seg, i) {
        seg.classList.toggle('done', !!done[i]);
      });
    }
    const count = done.filter(Boolean).length;
    const bar = dom.progressHint && dom.progressHint.closest('.progress-section');
    if (bar) {
      const roleEl = bar.querySelector('[role="progressbar"]');
      if (roleEl) roleEl.setAttribute('aria-valuenow', count);
    }
    if (dom.progressHint) {
      if (count === 3) {
        dom.progressHint.textContent = 'Signal clear. Check the database for the code.';
      } else {
        const parts = [];
        if (!state.tasks.dateTime) parts.push('date/time');
        if (!state.tasks.knobs) parts.push('volume & brightness');
        if (!state.tasks.physical) parts.push('physical puzzle');
        dom.progressHint.textContent = 'Adjust: ' + parts.join(', ') + '.';
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
