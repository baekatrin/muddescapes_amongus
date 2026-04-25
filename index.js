const MUTE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
  class="bi bi-volume-mute-fill" viewBox="0 0 16 16">
  <path d="M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06m7.137 2.096a.5.5 0 0 1 0 .708L12.207 8l1.647 1.646a.5.5 0 0 1-.708.708L11.5 8.707l-1.646 1.647a.5.5 0 0 1-.708-.708L10.793 8 9.146 6.354a.5.5 0 1 1 .708-.708L11.5 7.293l1.646-1.647a.5.5 0 0 1 .708 0"/>
</svg>`;

const UNMUTE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-volume-up-fill" viewBox="0 0 16 16">
  <path d="M11.536 14.01A8.47 8.47 0 0 0 14.026 8a8.47 8.47 0 0 0-2.49-6.01l-.708.707A7.48 7.48 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303z"/>
  <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.48 5.48 0 0 1 11.025 8a5.48 5.48 0 0 1-1.61 3.89z"/>
  <path d="M8.707 11.182A4.5 4.5 0 0 0 10.025 8a4.5 4.5 0 0 0-1.318-3.182L8 5.525A3.5 3.5 0 0 1 9.025 8 3.5 3.5 0 0 1 8 10.475zM6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06"/>
</svg>`;

/* ============================================================
   STAGE LOGIC (based on number of puzzles solved):
   Stage 0 — 0 solved: glitch GIFs on all cams, no audio buttons
   Stage 1 — 1 solved: static-room images replace glitch, captions shown, no audio buttons yet
   Stage 2 — 2 solved: audio/mute buttons appear on cams (videos still show static rooms)
   Stage 3 — 3 solved: real room videos replace static images, full audio
   ============================================================ */

const REAL_VIDEOS = {
  1: './data/real-rooms/airlock-real.mp4',
  2: './data/real-rooms/conference-room-real.mp4',
  3: './data/real-rooms/electrical-real.mp4',
  4: './data/real-rooms/plaza-real.mp4'
};

const puzzleState = { knobsSolved: false, dateSolved: false, arduinoSolved: false };

function getStage() {
  return Object.values(puzzleState).filter(Boolean).length;
}

// === localStorage helpers ===

function saveState() {
  localStorage.setItem('muddescapes_puzzleState', JSON.stringify(puzzleState));
}

function loadState() {
  try {
    const saved = localStorage.getItem('muddescapes_puzzleState');
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.assign(puzzleState, parsed);
    }
  } catch (e) {
    console.warn('Could not load saved puzzle state:', e);
  }
}

function resetPuzzle() {
  localStorage.removeItem('muddescapes_puzzleState');
  puzzleState.knobsSolved   = false;
  puzzleState.dateSolved    = false;
  puzzleState.arduinoSolved = false;
  realVideosLoaded = false;

  if (dateInput) { dateInput.disabled = false; dateInput.value = '2050-01-01'; }
  if (timeInput) { timeInput.disabled = false; timeInput.value = ''; }
  document.querySelectorAll('input-knob').forEach(k => k.style.pointerEvents = 'auto');

  updateTerminal();
  updateVideoState();
  console.log('Puzzle state reset.');
}

// === Terminal ===

function updateTerminal() {
  const set = (id, solved) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className   = solved ? 'term-checked' : 'term-empty';
    el.textContent = solved ? '✓' : '○';
  };
  set('knob-status',    puzzleState.knobsSolved);
  set('date-status',    puzzleState.dateSolved);
  set('arduino-status', puzzleState.arduinoSolved);
}

function addTerminalMessage(msg) {
  const msgDiv = document.getElementById('term-messages');
  if (!msgDiv) return;
  const line = document.createElement('div');
  line.className   = 'term-msg';
  line.textContent = msg;
  msgDiv.appendChild(line);
  const all = msgDiv.querySelectorAll('.term-msg');
  if (all.length > 6) all[0].remove();
  msgDiv.scrollTop = msgDiv.scrollHeight;
}

// === Video/Camera State ===

let realVideosLoaded = false;

function updateVideoState() {
  const stage = getStage();

  for (let cam = 1; cam <= 4; cam++) {
    const glitch    = document.querySelector(`.cctv-glitch-overlay[data-cam="${cam}"]`);
    const staticImg = document.querySelector(`.cctv-static-room[data-cam="${cam}"]`);
    const caption   = document.querySelector(`.cctv-room-caption[data-cam="${cam}"]`);
    const muteBtn   = document.querySelector(`.cctv-mute[data-cam="${cam}"]`);
    const video     = document.querySelector(`#vid${cam}`);
    if (!glitch || !staticImg || !caption || !muteBtn || !video) continue;

    if (stage === 0) {
      glitch.style.display    = 'block';
      staticImg.style.display = 'none';
      caption.style.display   = 'none';
      muteBtn.style.display   = 'none';
      video.muted = true;
    } else if (stage === 1) {
      glitch.style.display    = 'none';
      staticImg.style.display = 'block';
      caption.style.display   = 'block';
      muteBtn.style.display   = 'none';
      video.muted = true;
    } else if (stage === 2) {
      glitch.style.display    = 'none';
      staticImg.style.display = 'block';
      caption.style.display   = 'block';
      muteBtn.style.display   = 'block';
      video.muted = true;
    } else if (stage === 3) {
      glitch.style.display    = 'none';
      staticImg.style.display = 'none';
      caption.style.display   = 'none';
      muteBtn.style.display   = 'block';
      if (!realVideosLoaded) {
        video.src   = REAL_VIDEOS[cam];
        video.muted = false;
        video.load();
        video.play().catch(() => {});
      }
    }
  }

  if (stage === 3) realVideosLoaded = true;
}

// === Solve a Puzzle Component ===

function solvePuzzle(component) {
  if (puzzleState[component]) return;
  puzzleState[component] = true;
  saveState();
  const stage = getStage();

  if (component === 'dateSolved') {
    if (dateInput) dateInput.disabled = true;
    if (timeInput) timeInput.disabled = true;
  }

  updateTerminal();
  updateVideoState();

  const labels = {
    knobsSolved:   'Knob Configuration',
    dateSolved:    'Date/Time Verification',
    arduinoSolved: 'Physical Puzzle'
  };
  addTerminalMessage(`>> [✓] ${labels[component]} verified`);

  if (stage === 1) {
    addTerminalMessage('>> STATIC ROOM FEEDS LOADED');
    addTerminalMessage('>> Triangulating camera positions...');
  } else if (stage === 2) {
    addTerminalMessage('>> AUDIO CAPABILITIES RESTORED');
    addTerminalMessage('>> Warning: interference detected on all channels');
  } else if (stage === 3) {
    addTerminalMessage('>> ALL SYSTEMS ONLINE');
    addTerminalMessage('>> FULL ACCESS GRANTED — streaming live feeds');
  }
}

// === Mute Toggle ===

function toggleMute(btn) {
  const cam = btn.getAttribute('data-cam');
  if (getStage() < 2) return;
  const video    = document.querySelector(`#vid${cam}`);
  const wasMuted = video.muted;

  document.querySelectorAll('video').forEach(v => v.muted = true);
  document.querySelectorAll('.cctv-mute').forEach(b => b.innerHTML = MUTE_SVG);

  if (wasMuted) {
    video.muted   = false;
    btn.innerHTML = UNMUTE_SVG;
    video.play().catch(() => {});
  }
}

// ============================================================
// KNOBS
// ============================================================

const knobTargets = [
  { id: 'knob1', min: 30, max: 33, led: '#led1' },
  { id: 'knob2', min: 45, max: 48, led: '#led2' },
  { id: 'knob3', min: 78, max: 81, led: '#led3' },
  { id: 'knob4', min: 49, max: 52, led: '#led4' }
];

function checkAllKnobs() {
  const allCorrect = knobTargets.every(({ id, min, max }) => {
    const el = document.querySelector(`#${id} input-knob`);
    if (!el) return false;
    const v = parseFloat(el.value);
    return v > min && v < max;
  });
  if (allCorrect) {
    solvePuzzle('knobsSolved');
    document.querySelectorAll('input-knob').forEach(k => k.style.pointerEvents = 'none');
  }
}

knobTargets.forEach(({ id, min, max, led }) => {
  const knobEl    = document.querySelector(`#${id} input-knob`);
  const ledEl     = document.querySelector(led);
  const displayEl = document.querySelector(`#${id} .show-value`);
  if (!knobEl) return;

  knobEl.addEventListener('knob-move-change', (e) => {
    const val = parseFloat(e.target.value);
    if (displayEl) displayEl.textContent = Math.round(val);
    if (ledEl) ledEl.src = (val > min && val < max) ? './data/led-on.png' : './data/led-off.png';
    checkAllKnobs();
  });
});

// ============================================================
// DATE / TIME
// ============================================================

const dateInput = document.querySelector('#date');
const timeInput = document.querySelector('#time');

function checkDateTime() {
  console.log('date:', dateInput.value, '| time:', timeInput.value);
  const correctDate = dateInput.value === '2083-09-30';
  const correctTime = timeInput.value === '13:14';
  if (correctDate && correctTime) solvePuzzle('dateSolved');
}

if (dateInput) dateInput.addEventListener('change', checkDateTime);
if (timeInput) timeInput.addEventListener('change', checkDateTime);

// ============================================================
// ARDUINO (MQTT polling)
// ============================================================

setInterval(() => {
  if (window.MQTT_SOLVED === true) solvePuzzle('arduinoSolved');
}, 500);

// ============================================================
// INIT — restore saved state, then update UI
// ============================================================

loadState();

if (puzzleState.knobsSolved) {
  document.querySelectorAll('input-knob').forEach(k => k.style.pointerEvents = 'none');
}
if (puzzleState.dateSolved) {
  if (dateInput) { dateInput.disabled = true; dateInput.value = '2083-09-30'; }
  if (timeInput) { timeInput.disabled = true; timeInput.value = '13:14'; }
}

updateVideoState();
updateTerminal();