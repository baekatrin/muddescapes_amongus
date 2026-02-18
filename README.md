# muddescapes_amongus

Escape room puzzle web app: CCTV monitor + filterable database.

## Structure (split for independent work)

| Area | Files | Shared |
|------|--------|--------|
| **CCTV** | `cctv.html`, `cctv.css`, `cctv.js` | — |
| **Database** | `database.html`, `database.css`, `database.js` | — |
| **Hub** | `index.html` (links to both) | — |
| **Shared** | — | `data/entries.json`, `assets/` |

Work on the CCTV page only in `cctv.*` and on the database only in `database.*` so different people can edit different parts without merge conflicts.

## Run locally

Serve the project over HTTP (required so `data/entries.json` loads). From the project root:

```bash
# Python 3
python -m http.server 8000

# or npx
npx serve .
```

Open `http://localhost:8000` (or the port shown). Use the hub or go directly to `cctv.html` or `database.html`.

## Puzzle flow

1. **CCTV** (`cctv.html`): Select the correct date/time (Mar 22, 2024 14:45), adjust volume and brightness knobs into the “good” range, and complete the physical puzzle. Progress bar fills as tasks are done. Use `?physical=UNLOCK` in the URL to mark the physical puzzle complete (e.g. for staff or hardware).
2. **Database** (`database.html`): Filter by name, place, time, and species (from the cleared footage). When exactly one row matches, its code is shown. The winning combination is: **J. Smith**, **Lab 3**, **14:45**, **Human** → code **ALPHA7**.

## Assets

- Add a video file at `assets/placeholder.mp4` for the CCTV feed, or change the `<video src="...">` in `cctv.html` to your file or URL.

## Data

- `data/entries.json` holds 500 entries (one winning). Regenerate with: `python generate_data.py`
