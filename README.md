# MuddEscapes Among Us

An immersive web-based escape room experience featuring multiple puzzle challenges: a CCTV security system with analog controls, camera feeds, and a searchable database. Players must work through vigilant monitoring, precise mechanical adjustments, and investigative database searches to uncover the winning code.

## 🎮 Quick Start

### Prerequisites

- Python 3+ OR Node.js/npm
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Run Locally

This project must be served over HTTP (not file:// protocol). Choose one:

```bash
# Python 3
python -m http.server 8000

# OR Node.js
npx serve .
```

Then open **`http://localhost:8000`** in your browser.

---

## 📍 Puzzle Components

### 1. **Main CCTV System** (`index.html`, `index.js`, `index.css`)

A 4-camera security monitor interface with dual objectives:

#### Objective A: Date/Time Synchronization

- Select the correct **date: 2083-01-01**
- Select the correct **time: 10:00**
- When both are correct, the video feed switches to secondary footage (`videoplayback2.mp4`)
- A success message confirms: _"Date and time are correct! Footage has been displayed."_

#### Objective B: Analog Knob Calibration

- Four manual control knobs must be adjusted to specific ranges:
  - **Knob 1**: 30–33
  - **Knob 2**: 45–48
  - **Knob 3**: 78–81
  - **Knob 4**: 49–52
- Each knob has an **LED indicator** (`led-off.png` / `led-on.png`) that lights up when in range
- When all 4 knobs are correctly calibrated, mute buttons appear and a success message displays
- Success message: _"Knobs are correct! Audio capabilities have been restored."_

#### Camera & Audio Controls

- 4 camera feeds, each displaying `videoplayback.mp4` by default
- Each camera has a mute button (hidden until knobs succeed) to control individual audio tracks

---

### 2. **Alternative CCTV Interface** (`cctv.html`, `cctv.js`, `cctv.css`)

A single-camera security monitoring system with progressive task completion:

#### Three Task Requirements

1. **Select Correct Date/Time**: March 22, 2024 at 14:45
2. **Adjust Analog Controls**:
   - **Volume**: 40–80% (displayed as decimal 0.4–0.8)
   - **Brightness**: 45–75
   - Visual feedback via knob rotation and video filter adjustments
3. **Complete Physical Puzzle**: Use URL parameter `?physical=UNLOCK` or hardware trigger

#### Visual Feedback

- **Progress Bar**: Shows "Signal quality" with 3 segments (one per task)
- **Video Filters**: Footage is blurred (8px blur) until physical puzzle is unlocked
- **Hint Text**: Updates dynamically based on remaining tasks
- Final success message: _"Signal clear. Check the database for the code."_

#### Persistent State

- All settings stored in browser `localStorage` so progress is saved between sessions
- Knob positions, date/time selection, and physical puzzle status all persist

---

### 3. **Database Search** (`database.html`, `database.js`, `database.css`)

Investigative filtering to find the winning suspect record:

#### Database Features

- **500 suspect records** (1 is the winner)
- **Real-time filtering** by:
  - Name
  - Place (location)
  - Time
  - Species
- **Auto-reveal Code**: When exactly 1 record matches all filters, the code appears
- **Winning Combination**:
  - Name: **J. Smith**
  - Place: **Lab 3**
  - Time: **14:45**
  - Species: **Human**
  - Code: **ALPHA7**

#### Table Display

- Codes are hidden (shown as "—") when multiple rows match
- Code column visible only for the single matching record
- Fast client-side filtering (no server required)

---

## 📁 Project Structure

```
muddescapes_amongus/
├── index.html           # Main CCTV dashboard (4 cameras)
├── index.js             # Knob calibration & date/time logic
├── index.css            # Main CCTV styling
├── cctv.html            # Alternative single-camera CCTV interface
├── cctv.js              # Video filters, progress bar, state management
├── cctv.css             # CCTV styling
├── database.html        # Suspect database interface
├── database.js          # Table filtering & code reveal logic
├── database.css         # Database styling
├── generate_data.py     # Script to generate entries.json
├── data/
│   ├── entries.json         # 500 database records (generated)
│   ├── videoplayback.mp4    # Primary video (cameras)
│   ├── videoplayback2.mp4   # Secondary video (after correct date/time)
│   ├── led-on.png           # LED indicator (active)
│   ├── led-off.png          # LED indicator (inactive)
│   ├── rec-overlay.png      # Recording indicator (REC overlay)
│   ├── knob-bg.png          # Knob background image
│   ├── glitch1.gif          # Glitch effect (optional)
│   └── glitch2.gif          # Glitch effect (optional)
└── README.md
```

---

## 🔧 Configuration & Customization

### Modify Winning Combination (Database)

Edit [database.js](database.js) and search for the `filter()` function to change the winning record requirements.

**Current winning record:**

```javascript
// Name: J. Smith, Place: Lab 3, Time: 14:45, Species: Human
```

### Generate New Database Entries

Run the Python script to create a fresh `entries.json` with randomized records:

```bash
python generate_data.py
```

**Customize in [generate_data.py](generate_data.py):**

- `names[]` – Suspect names
- `places[]` – Location options
- `times[]` – Time stamps
- `species[]` – Suspect species
- `codes[]` – Possible unlock codes
- `win` object – Define the winning combination

### Replace Videos

- **Main CCTV** (`index.html`): Update video sources in the HTML:
  ```html
  <video id="vid1" src="./data/videoplayback.mp4" ...></video>
  <video id="vid2" src="./data/videoplayback2.mp4" ...></video>
  ```
- **Alternative CCTV** (`cctv.html`): Uses `#cctv-video` element with `assets/placeholder.mp4`

### Adjust Knob Targets

**Main CCTV** (`index.js`):

```javascript
const knobTargets = [
  { id: "knob1", min: 30, max: 33, led: "#led1" },
  { id: "knob2", min: 45, max: 48, led: "#led2" },
  { id: "knob3", min: 78, max: 81, led: "#led3" },
  { id: "knob4", min: 49, max: 52, led: "#led4" },
];
```

**Alternative CCTV** (`cctv.js`):

```javascript
const KNOB_VOLUME_GOAL_MIN = 0.4;
const KNOB_VOLUME_GOAL_MAX = 0.8;
const KNOB_BRIGHTNESS_GOAL_MIN = 45;
const KNOB_BRIGHTNESS_GOAL_MAX = 75;
```

### Change Correct Date/Time

**Main CCTV** (`index.js`):

```javascript
if (date.value == "2083-01-01") {
  isDate = true;
}
if (time.value == "10:00") {
  isTime = true;
}
```

**Alternative CCTV** (`cctv.js`):

```javascript
const CORRECT_DATETIME = "correct"; // Matches <option value="correct">Mar 22, 2024 14:45</option>
```

---

## 🛠️ Technical Details

- **Pure JavaScript** – No frameworks, no build step required
- **Responsive Design** – Works on desktop and tablets
- **Local Storage** – Persists player progress across page reloads (Alternative CCTV only)
- **Client-Side Filtering** – Database searches run instantly without server calls
- **Accessible** – ARIA labels, semantic HTML, keyboard navigation support
- **Web Standard Video** – MP4 format with autoplay/muted support

---

## 🐛 Troubleshooting

| Issue                         | Solution                                                                                  |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| **Data/videos won't load**    | Ensure serving over HTTP, not `file://` protocol                                          |
| **Knobs not responding**      | Check that `input-knob` module is loaded; verify browser support                          |
| **Videos not playing**        | Ensure MP4 files exist in `data/` folder; check browser autoplay policies (require muted) |
| **Progress bar not updating** | Check browser console for errors; verify localStorage is enabled                          |
| **Database shows no results** | Verify `data/entries.json` exists and is valid JSON; regenerate if corrupted              |

---

## 🎯 Testing the Solution

### Main CCTV (`index.html`)

1. Set **Date**: 2083-01-01
2. Set **Time**: 10:00
3. Calibrate all 4 knobs to their ranges:
   - Knob 1 → 30–33
   - Knob 2 → 45–48
   - Knob 3 → 78–81
   - Knob 4 → 49–52

### Alternative CCTV (`cctv.html`)

1. Set **Date**: Mar 22, 2024
2. Set **Time**: 14:45
3. Adjust **Volume** to 40–80%
4. Adjust **Brightness** to 45–75
5. (Optional) Add `?physical=UNLOCK` to URL to complete physical puzzle task

### Database (`database.html`)

1. Filter **Name**: J. Smith
2. Filter **Place**: Lab 3
3. Filter **Time**: 14:45
4. Filter **Species**: Human
5. **Code**: ALPHA7 appears

---

## 📝 License & Credits

Developed for HMC MuddEscapes, an escape room experience at Harvey Mudd College.

All rights reserved.
