# MuddEscapes Among Us

An immersive web-based escape room experience featuring multiple puzzle challenges: a CCTV security system with analog controls, camera feeds, and a searchable database. Players must work through vigilant monitoring, precise mechanical adjustments, and investigative database searches to uncover the winning code.

## Prerequisites

Install the drivers: https://www.silabs.com/software-and-tools/usb-to-uart-bridge-vcp-drivers?tab=downloads

## How to Run

In one terminal, run:

```
python -m http.server 8000
```

In another terminal, run:

```
npm install mqtt serialport @serialport/parser-readline
node arduino-mqtt-bridge.js
```

## How to Reset Puzzle between Runs

1. Unplug arduino from computer, move the knobs to random positions that are not the completed positions.
2. Plug it back in.
3. On the webpage, go to More Tools > Developer Tools > Console, and type

```
resetPuzzle()
```

## 📝 License & Credits

Developed for HMC MuddEscapes, an escape room experience at Harvey Mudd College.

All rights reserved.
