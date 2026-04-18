const MUTE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
            class="bi bi-volume-mute-fill" viewBox="0 0 16 16">
            <path
              d="M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06m7.137 2.096a.5.5 0 0 1 0 .708L12.207 8l1.647 1.646a.5.5 0 0 1-.708.708L11.5 8.707l-1.646 1.647a.5.5 0 0 1-.708-.708L10.793 8 9.146 6.354a.5.5 0 1 1 .708-.708L11.5 7.293l1.646-1.647a.5.5 0 0 1 .708 0" />
          </svg>`;
const UNMUTE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-volume-up-fill" viewBox="0 0 16 16">
  <path d="M11.536 14.01A8.47 8.47 0 0 0 14.026 8a8.47 8.47 0 0 0-2.49-6.01l-.708.707A7.48 7.48 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303z"/>
  <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.48 5.48 0 0 1 11.025 8a5.48 5.48 0 0 1-1.61 3.89z"/>
  <path d="M8.707 11.182A4.5 4.5 0 0 0 10.025 8a4.5 4.5 0 0 0-1.318-3.182L8 5.525A3.5 3.5 0 0 1 9.025 8 3.5 3.5 0 0 1 8 10.475zM6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06"/>
</svg>`;

/* ============================================================
   PUZZLE PROGRESSION SYSTEM
   ============================================================
   Tracks 3 puzzle components:
   1. Knob Configuration
   2. Date/Time Verification
   3. Physical Puzzle (Arduino)
   
   State Progression:
   - Stage 0 (No solutions): Videos show glitch, no audio buttons
   - Stage 1 (1+ solved): Audio buttons appear, play static noise
   - Stage 2 (2+ solved): Videos show static-rooms, audio is white noise
   - Stage 3 (All solved): Videos show real-rooms, full audio available
   ============================================================ */

// === Progression State ===
const puzzleState = {
  knobsSolved: false,
  dateSolved: false,
  arduinoSolved: false
};

// === Helper Functions ===

function getStage() {
  const solvedCount = Object.values(puzzleState).filter(v => v).length;
  return solvedCount;
}

function updateProgressTerminal() {
  const stage = getStage();
  
  // Update status indicators
  document.getElementById('knob-status').className = puzzleState.knobsSolved ? 'term-checked' : 'term-empty';
  document.getElementById('knob-status').textContent = puzzleState.knobsSolved ? '✓' : '○';
  
  document.getElementById('date-status').className = puzzleState.dateSolved ? 'term-checked' : 'term-empty';
  document.getElementById('date-status').textContent = puzzleState.dateSolved ? '✓' : '○';
  
  document.getElementById('arduino-status').className = puzzleState.arduinoSolved ? 'term-checked' : 'term-empty';
  document.getElementById('arduino-status').textContent = puzzleState.arduinoSolved ? '✓' : '○';
  
  // Add message to terminal
  const msgDiv = document.getElementById('term-messages');
  if (stage === 3) {
    addTerminalMessage('>> ALL SYSTEMS ONLINE. FULL ACCESS GRANTED.');
  }
}

function addTerminalMessage(msg) {
  const msgDiv = document.getElementById('term-messages');
  const line = document.createElement('div');
  line.className = 'term-msg';
  line.textContent = msg;
  msgDiv.appendChild(line);
  
  // Keep only last 3 messages
  const messages = msgDiv.querySelectorAll('.term-msg');
  if (messages.length > 3) {
    messages[0].remove();
  }
}

function updateVideoState() {
  const stage = getStage();
  
  for (let cam = 1; cam <= 4; cam++) {
    const glitchOverlay = document.querySelector(`.cctv-glitch-overlay[data-cam="${cam}"]`);
    const staticRoom = document.querySelector(`.cctv-static-room[data-cam="${cam}"]`);
    const roomCaption = document.querySelector(`.cctv-room-caption[data-cam="${cam}"]`);
    const muteBtn = document.querySelector(`.cctv-mute[data-cam="${cam}"]`);
    const video = document.querySelector(`#vid${cam}`);
    
    if (stage === 0) {
      // Stage 0: Glitch overlay visible, no audio buttons
      glitchOverlay.style.display = 'block';
      staticRoom.style.display = 'none';
      roomCaption.style.display = 'none';
      muteBtn.style.display = 'none';
      video.muted = true;
    } else if (stage === 1) {
      // Stage 1: Glitch overlay visible, audio buttons available (static noise)
      glitchOverlay.style.display = 'block';
      staticRoom.style.display = 'none';
      roomCaption.style.display = 'none';
      muteBtn.style.display = 'block';
      video.muted = true; // Video muted, but button controls static audio
    } else if (stage === 2) {
      // Stage 2: Static room image, room caption, audio buttons (white noise)
      glitchOverlay.style.display = 'none';
      staticRoom.style.display = 'block';
      roomCaption.style.display = 'block';
      muteBtn.style.display = 'block';
      video.muted = true; // Still muted, white noise through audio system
    } else if (stage === 3) {
      // Stage 3: Real video, full audio
      glitchOverlay.style.display = 'none';
      staticRoom.style.display = 'none';
      roomCaption.style.display = 'none';
      muteBtn.style.display = 'block';
      video.muted = false; // Full video with audio
    }
  }
}

function solvePuzzle(component) {
  const prevStage = getStage();
  
  puzzleState[component] = true;
  const newStage = getStage();
  
  updateProgressTerminal();
  updateVideoState();
  
  // Log unlock messages
  if (component === 'knobsSolved') {
    addTerminalMessage('>> [✓] Knob Configuration verified');
    if (newStage === 1) addTerminalMessage('>> AUDIO CAPABILITIES RESTORED');
  } else if (component === 'dateSolved') {
    addTerminalMessage('>> [✓] Date/Time verification complete');
    if (newStage === 2) addTerminalMessage('>> STATIC ROOMS LOADED. ANALYZING...');
  } else if (component === 'arduinoSolved') {
    addTerminalMessage('>> [✓] Physical puzzle solved');
    if (newStage === 2 && !puzzleState.dateSolved && !puzzleState.knobsSolved) {
      addTerminalMessage('>> STATIC ROOMS LOADED. ANALYZING...');
    } else if (newStage === 3) {
      addTerminalMessage('>> FULL ACCESS GRANTED. STREAMING REAL-ROOMS...');
    }
  }
}

function toggleMute(btn) {
  const cam = btn.getAttribute('data-cam');
  const stage = getStage();
  
  if (stage === 0) return; // Audio not available yet
  
  const video = document.querySelector(`#vid${cam}`);
  const allButtons = document.querySelectorAll('.cctv-mute');
  
  if (stage >= 1) {
    // Toggle mute for this video, mute all others
    const wasUnmuted = !video.muted;
    
    // Mute all videos
    document.querySelectorAll('video').forEach(v => v.muted = true);
    allButtons.forEach(b => b.innerHTML = MUTE_SVG);
    
    // Unmute selected if it was muted
    if (wasUnmuted) {
      // All muted, keep all muted
      video.muted = true;
    } else {
      // Unmute this one
      video.muted = false;
      btn.innerHTML = UNMUTE_SVG;
      
      // Play appropriate audio for stage
      if (stage === 1 || stage === 2) {
        // Stage 1-2: Play static/white noise (muted video, audio through system)
        video.play().catch(() => {});
      }
    }
  }
}

// === KNOB CONFIGURATION ===

const MUTE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
            class="bi bi-volume-mute-fill" viewBox="0 0 16 16">
            <path
              d="M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06m7.137 2.096a.5.5 0 0 1 0 .708L12.207 8l1.647 1.646a.5.5 0 0 1-.708.708L11.5 8.707l-1.646 1.647a.5.5 0 0 1-.708-.708L10.793 8 9.146 6.354a.5.5 0 1 1 .708-.708L11.5 7.293l1.646-1.647a.5.5 0 0 1 .708 0" />
          </svg>`;
const UNMUTE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-volume-up-fill" viewBox="0 0 16 16">
  <path d="M11.536 14.01A8.47 8.47 0 0 0 14.026 8a8.47 8.47 0 0 0-2.49-6.01l-.708.707A7.48 7.48 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303z"/>
  <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.48 5.48 0 0 1 11.025 8a5.48 5.48 0 0 1-1.61 3.89z"/>
  <path d="M8.707 11.182A4.5 4.5 0 0 0 10.025 8a4.5 4.5 0 0 0-1.318-3.182L8 5.525A3.5 3.5 0 0 1 9.025 8 3.5 3.5 0 0 1 8 10.475zM6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06"/>
</svg>`;

const knob1 = document.querySelector('#knob1 input-knob');
const knob2 = document.querySelector('#knob2 input-knob');
const knob3 = document.querySelector('#knob3 input-knob');
const knob4 = document.querySelector('#knob4 input-knob');

function toggleMute(btn) {
    const allVideos = document.querySelectorAll('video');
    const allButtons = document.querySelectorAll('.cctv-mute')
    const currentVideo = btn.previousElementSibling;

    if (currentVideo.muted) {
        allVideos.forEach((video, index) => {
            video.muted = true;
            allButtons[index].innerHTML = MUTE_SVG;
        });
        currentVideo.muted = false;
        btn.innerHTML = UNMUTE_SVG;
    } else {
        currentVideo.muted = true;
        btn.innerHTML = MUTE_SVG;
    }
}


// Store your targets in an array to make checking easier
const knobTargets = [
  { id: 'knob1', min: 30, max: 33, led: '#led1' },
  { id: 'knob2', min: 45, max: 48, led: '#led2' },
  { id: 'knob3', min: 78, max: 81, led: '#led3' },
  { id: 'knob4', min: 49, max: 52, led: '#led4' }
];

// Re-usable check function
function checkAllKnobs() {
  const allCorrect = knobTargets.every(target => {
    const el = document.querySelector(`#${target.id} input-knob`);
    return el.value > target.min && el.value < target.max;
  });

  if (allCorrect) {
    const successMsg = document.getElementById('knobs-success');
    successMsg.hidden = false; // Removes the 'hidden' attribute
    successMsg.style.display = 'block';
    
    // Disable knobs and show mute buttons
    document.querySelectorAll('input-knob').forEach(k => k.style.pointerEvents = 'none');
    document.querySelectorAll('.cctv-mute').forEach(b => b.hidden = false);
  }
}

// Set up listeners for all knobs at once
knobTargets.forEach(target => {
  const knobEl = document.querySelector(`#${target.id} input-knob`);
  if (!knobEl) return; // Skip if knob not found
  
  const ledEl = document.querySelector(target.led);
  const displayEl = document.querySelector(`#${target.id} .show-value`);

  knobEl.addEventListener('knob-move-change', (e) => {
    const val = e.target.value;
    if (displayEl) displayEl.textContent = val;

    if (ledEl) { // Only set src if ledEl exists
      if (val > target.min && val < target.max) {
        ledEl.src = "./data/led-on.png";
      } else {
        ledEl.src = "./data/led-off.png";
      }
    }
    
    checkAllKnobs(); // The "Master Check"
  });
});

// === DATE/TIME VERIFICATION ===

const date = document.querySelector('#date');
const time = document.querySelector('#time');

function checkDateTime() {
    const correctDate = date.value === "2083-01-01";
    const correctTime = time.value === "10:00";
    
    isDate = correctDate;
    isTime = correctTime;

    if (correctDate && correctTime && !puzzleState.dateSolved) {
        solvePuzzle('dateSolved');
    }
}

date.addEventListener('change', checkDateTime);
time.addEventListener('change', checkDateTime);

// === ARDUINO PUZZLE (MQTT) ===

let mqttConnected = false;

// Listen for MQTT messages
// mqtt-bridge.js publishes to: victor/bar1, victor/bar2, victor/solved
const observer = setInterval(() => {
  const bar1Element = document.querySelector('[data-bar="1"]');
  const bar2Element = document.querySelector('[data-bar="2"]');
  
  // Check if puzzle is solved from MQTT signal
  if (window.MQTT_SOLVED === true && !puzzleState.arduinoSolved) {
    solvePuzzle('arduinoSolved');
  }
}, 500);

// === INITIALIZATION ===

// Initialize UI in stage 0
updateVideoState();
updateProgressTerminal();
