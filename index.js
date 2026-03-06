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

var isDate = false;
var isTime = false;

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
    const ledEl = document.querySelector(target.led);
    const displayEl = document.querySelector(`#${target.id} .show-value`);

    knobEl.addEventListener('knob-move-change', (e) => {
        const val = e.target.value;
        if (displayEl) displayEl.textContent = val;

        if (val > target.min && val < target.max) {
            ledEl.src = "./data/led-on.png";
        } else {
            ledEl.src = "./data/led-off.png";
        }

        checkAllKnobs(); // The "Master Check"
    });
});

const videoTargets = ['#vid1', '#vid2', '#vid3', '#vid4']

function checkDateTime() {

    const displayWinDate = document.querySelector('#date-time-success');

    if (isTime && isDate) {
        displayWinDate.hidden = false;
        time.style.display = 'block';
        date.style.display = 'block';
        videoTargets.forEach(element => {
            const videoEl = document.querySelector(element);
            videoEl.src = './data/videoplayback2.mp4';
            videoEl.play();
        });
    }
}

const date = document.querySelector('#date');
const time = document.querySelector('#time');


date.addEventListener('change', (e) => {
    if (date.value == "2083-01-01") {
        isDate = true;
    } else {
        isDate = false;
    }
    checkDateTime()
})

time.addEventListener('change', (e) => {
    if (time.value == "10:00") {
        isTime = true;
    } else {
        isTime = false;
    }
    checkDateTime()
})
