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
   CCTV stage (two puzzles: date/time + Arduino; knob puzzle removed).
   Stage 1 is skipped visually: first solve jumps straight to “old stage 2” behavior.
   Stage 0 — 0 solved: glitch, no mute
   Stage 2 — 1 solved: static rooms, captions, mute buttons (skips mute-off interim)
   Stage 3 — 2 solved: real room MP4s, captions, mute buttons
   ============================================================ */

const REAL_VIDEOS = {
  1: './data/real-rooms/airlock-real.mp4',
  2: './data/real-rooms/conference-room-real.mp4',
  3: './data/real-rooms/electrical-real.mp4',
  4: './data/real-rooms/plaza-real.mp4'
};

const puzzleState = { dateSolved: false, arduinoSolved: false };

function getSolvedCount() {
  return Object.values(puzzleState).filter(Boolean).length;
}

/** Drives glitch / static / video / mute UI; maps 1 solve → former stage 2. */
function getVideoStage() {
  const n = getSolvedCount();
  if (n === 0) return 0;
  if (n === 1) return 2;
  return 3;
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
      if (typeof parsed.dateSolved === 'boolean') puzzleState.dateSolved = parsed.dateSolved;
      if (typeof parsed.arduinoSolved === 'boolean') puzzleState.arduinoSolved = parsed.arduinoSolved;
    }
  } catch (e) {
    console.warn('Could not load saved puzzle state:', e);
  }
}

function resetPuzzle() {
  localStorage.removeItem('muddescapes_puzzleState');
  puzzleState.dateSolved    = false;
  puzzleState.arduinoSolved = false;
  realVideosLoaded = false;

  if (dateInput) { dateInput.disabled = false; dateInput.value = '2050-01-01'; }
  if (timeInput) { timeInput.disabled = false; timeInput.value = ''; }

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
  const stage = getVideoStage();

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
    } else if (stage === 2) {
      glitch.style.display    = 'none';
      staticImg.style.display = 'block';
      caption.style.display   = 'block';
      muteBtn.style.display   = 'block';
      video.muted = true;
    } else if (stage === 3) {
      glitch.style.display    = 'none';
      staticImg.style.display = 'none';
      caption.style.display   = 'block';
      muteBtn.style.display   = 'block';
      if (!realVideosLoaded) {
        video.src   = REAL_VIDEOS[cam];
        video.muted = true;
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
  const solvedCount = getSolvedCount();

  if (component === 'dateSolved') {
    if (dateInput) dateInput.disabled = true;
    if (timeInput) timeInput.disabled = true;
  }

  updateTerminal();
  updateVideoState();

  const labels = {
    dateSolved:    'Date/Time Verification',
    arduinoSolved: 'Physical Puzzle'
  };
  addTerminalMessage(`>> [✓] ${labels[component]} verified`);

  if (solvedCount === 1) {
    addTerminalMessage('>> STATIC ROOM FEEDS LOADED');
    addTerminalMessage('>> Triangulating camera positions...');
    addTerminalMessage('>> AUDIO CAPABILITIES RESTORED');
    addTerminalMessage('>> Warning: interference detected on all channels');
  } else if (solvedCount === 2) {
    addTerminalMessage('>> ALL SYSTEMS ONLINE');
    addTerminalMessage('>> FULL ACCESS GRANTED — streaming live feeds');
  }
}

// === Mute Toggle ===

function toggleMute(btn) {
  const cam = btn.getAttribute('data-cam');
  if (getVideoStage() < 2) return;
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
// DATE / TIME
// ============================================================

const dateInput = document.querySelector('#date');
const timeInput = document.querySelector('#time');

function checkDateTime() {
  console.log('date:', dateInput.value, '| time:', timeInput.value);
  const correctDate = dateInput.value === '2083-09-30';
  const correctTime = timeInput.value === '01:14';
  if (correctDate && correctTime) solvePuzzle('dateSolved');
}

if (dateInput) dateInput.addEventListener('change', checkDateTime);
if (timeInput) timeInput.addEventListener('change', checkDateTime);

// ============================================================
// ARDUINO (MQTT: mqtt-bridge.js sets window.MQTT_SOLVED from victor/solved + bar thresholds)
// ============================================================

function tryArduinoMqttSolve() {
  if (window.MQTT_SOLVED === true) solvePuzzle('arduinoSolved');
}

window.addEventListener('muddescapes-mqtt-solved-change', (e) => {
  if (e.detail && e.detail.solved === true) tryArduinoMqttSolve();
});

setInterval(tryArduinoMqttSolve, 500);

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

// If MQTT already marked solved before this script finished (unlikely), honor it immediately.
tryArduinoMqttSolve();