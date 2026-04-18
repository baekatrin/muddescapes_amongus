#include <Arduino.h>
#include <muddescapes.h>
#include <PubSubClient.h>

// =============================================================================
// PUZZLE: "Signal Quality" – Video Feed Calibration
//
// HARDWARE:
//   4x sliding linear potentiometers
//   2x LM3914 LED bar graph drivers (bar mode: MODE pin tied to V+)
//   2x 10-segment LED bar graphs
//   ESP32 Feather Huzzah32
//
// PUZZLE RULES:
//
//   BAR GRAPH 1 (A1 + A2) — "Gain"
//     The bar fills as the sum of A1+A2 rises toward a target window.
//     If the sum goes ABOVE the target window, the bar drops back down.
//     Only landing in the sweet spot fills the bar completely.
//
//     Target window center: ~60% of MAX_SUM  (≈ 4914 out of 8190)
//     Sweet spot half-width: ±5% of MAX_SUM  (≈ ±409 counts)
//     Full-bar zone: roughly 4505–5323
//
//   BAR GRAPH 2 (B1 + B2) — "Balance"
//     The bar shows the average deviation of both B pots from TARGET_POT_B.
//     Bar fully dark = both B1 and B2 are near TARGET_POT_B simultaneously.
//     Moving either pot closer to target always visibly dims the bar.
//
//     Target value for each pot: ~50% of MAX_ADC (≈ 2047)
//     Tolerance per pot: ±150 ADC counts (~3.7% of travel)
//
// SOLVED:
//   Bar 1 fully lit AND Bar 2 fully dark simultaneously.
//
// PIN WIRING:
//   Pot A1 wiper  → GPIO 34 (A2)
//   Pot A2 wiper  → GPIO 39 (A3)
//   Pot B1 wiper  → GPIO 36 (A4)
//   Pot B2 wiper  → GPIO 33 (D33)
//   DAC output 1  → GPIO 25 (A0) → LM3914 #1 VIN
//   DAC output 2  → GPIO 26 (A1) → LM3914 #2 VIN
//
// LM3914 WIRING (each chip, do this twice):
//   Pin 2  (GND)     → GND
//   Pin 3  (V+)      → 3.3V
//   Pin 4  (RHI)     → 3.3V
//   Pin 5  (VIN)     → DAC pin from ESP32
//   Pin 6  (RLO)     → GND
//   Pin 9  (MODE)    → 3.3V  (bar mode)
//   Pins 1, 10–18   → bar graph cathode pins via 470Ω resistors
//   Pin 7  (REF OUT) → leave unconnected
//
// LED BAR GRAPH WIRING:
//   Pins 11–20 (anodes)  → 3.3V rail directly
//   Pins 1–10  (cathodes)→ 470Ω resistor → LM3914 output pin
// =============================================================================

void solve_puzzle();
void reset_puzzle();

bool solved_puzzle = false;

// --- ADC input pins (ADC1 only — ADC2 conflicts with WiFi) ---
const int POT_A1_PIN = 34;  // A2
const int POT_A2_PIN = 39;  // A3
const int POT_B1_PIN = 36;  // A4
const int POT_B2_PIN = 33;  // D33

// --- DAC output pins (ESP32 onboard 8-bit DAC, 0–3.3V) ---
const int DAC_BAR1_PIN = 25;  // A0
const int DAC_BAR2_PIN = 26;  // A1

// --- ADC range ---
const int MAX_ADC = 4095;
const int MAX_SUM = MAX_ADC * 2;  // 8190 (two pots summed)

// --- Noise smoothing ---
const int SMOOTH_SAMPLES = 8;

// =============================================================================
// BAR 1 TUNING — Sweet Spot Window
// =============================================================================
const int TARGET_SUM_A            = (int)(MAX_SUM * 0.60f);  // 4914
const int SWEET_SPOT_HALF_WIDTH_A = (int)(MAX_SUM * 0.05f);  // 409 (±5%)

// =============================================================================
// BAR 2 TUNING — Specific Position Match
// =============================================================================
const int TARGET_POT_B    = (int)(MAX_ADC * 0.50f);  // 2047 (midpoint)
const int POT_TOLERANCE_B = 150;                       // ±150 counts (~3.7%)

// --- Bar 1 DAC threshold to count as solved (accounts for ADC noise) ---
const uint8_t BAR1_SOLVED_THRESHOLD = 245;

// --- MQTT Publishing (send sensor values to web in real-time) ---
unsigned long lastPublishTime = 0;
const unsigned long PUBLISH_INTERVAL = 100;  // Publish every 100ms

// --- MuddEscapes ---
MuddEscapes &me = MuddEscapes::getInstance();

muddescapes_callback callbacks[]{
  {"Solve Victor's puzzle", solve_puzzle},
  {"Reset Victor's puzzle", reset_puzzle},
  {NULL, NULL}
};

muddescapes_variable variables[]{
  {"Current state of Victor's puzzle", &solved_puzzle},
  {NULL, NULL}
};

// =============================================================================
// HELPERS
// =============================================================================

int smoothAnalogRead(int pin) {
  long total = 0;
  for (int i = 0; i < SMOOTH_SAMPLES; i++) {
    total += analogRead(pin);
    delayMicroseconds(50);
  }
  return (int)(total / SMOOTH_SAMPLES);
}

// Bar 1: triangle DAC — peaks at TARGET_SUM_A, falls off in both directions.
uint8_t computeBar1Dac(int sumA) {
  sumA = constrain(sumA, 0, MAX_SUM);
  int distance = abs(sumA - TARGET_SUM_A);
  int scale = max(TARGET_SUM_A, MAX_SUM - TARGET_SUM_A);
  int dac = map(distance, 0, scale, 255, 0);
  return (uint8_t)constrain(dac, 0, 255);
}

// Bar 2: average deviation of both B pots from TARGET_POT_B.
// Both on-target → DAC 0 (bar dark). Either off-target → bar lights up.
uint8_t computeBar2Dac(int b1, int b2) {
  int dev1 = abs(b1 - TARGET_POT_B);
  int dev2 = abs(b2 - TARGET_POT_B);
  int avgDev = (dev1 + dev2) / 2;
  int dac = map(avgDev, 0, MAX_ADC / 2, 0, 255);
  return (uint8_t)constrain(dac, 0, 255);
}

// =============================================================================
// REMOTE CONTROL CALLBACKS
// =============================================================================

void solve_puzzle() {
  solved_puzzle = true;
  dacWrite(DAC_BAR1_PIN, 255);
  dacWrite(DAC_BAR2_PIN, 0);
}

void reset_puzzle() {
  solved_puzzle = false;
}

// =============================================================================
// SETUP
// =============================================================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  dacWrite(DAC_BAR1_PIN, 0);
  dacWrite(DAC_BAR2_PIN, 0);

  Serial.println("=== Puzzle booting ===");
  Serial.print("Bar 1 target sum:     "); Serial.println(TARGET_SUM_A);
  Serial.print("Bar 1 sweet spot ±:   "); Serial.println(SWEET_SPOT_HALF_WIDTH_A);
  Serial.print("Bar 2 target per pot: "); Serial.println(TARGET_POT_B);
  Serial.print("Bar 2 tolerance ±:    "); Serial.println(POT_TOLERANCE_B);
  Serial.println("======================");

  me.init(
    "Claremont-ETC",
    "Cl@remontI0T",
    "mqtt://broker.hivemq.com",
    "Victor",
    callbacks,
    variables
  );
}

// =============================================================================
// LOOP
// =============================================================================

void loop() {
  if (!solved_puzzle) {
    // --- Read all four potentiometers ---
    int a1 = smoothAnalogRead(POT_A1_PIN);
    int a2 = smoothAnalogRead(POT_A2_PIN);
    int b1 = smoothAnalogRead(POT_B1_PIN);
    int b2 = smoothAnalogRead(POT_B2_PIN);

    int sumA = a1 + a2;

    // --- Compute DAC values ---
    uint8_t dac1 = computeBar1Dac(sumA);
    uint8_t dac2 = computeBar2Dac(b1, b2);

    // --- Drive the LM3914 chips ---
    dacWrite(DAC_BAR1_PIN, dac1);
    dacWrite(DAC_BAR2_PIN, dac2);

    // --- Check solved condition ---
    bool bar1_solved = (dac1 >= BAR1_SOLVED_THRESHOLD);
    bool bar2_solved = (abs(b1 - TARGET_POT_B) <= POT_TOLERANCE_B &&
                        abs(b2 - TARGET_POT_B) <= POT_TOLERANCE_B);

    // --- Serial debug output ---
    Serial.print("A1:");     Serial.print(a1);
    Serial.print(" A2:");    Serial.print(a2);
    Serial.print(" sumA:");  Serial.print(sumA);
    Serial.print(" dac1:");  Serial.print(dac1);
    Serial.print(" | B1:");  Serial.print(b1);
    Serial.print(" B2:");    Serial.print(b2);
    Serial.print(" dac2:");  Serial.print(dac2);
    Serial.print(" | bar1_solved:"); Serial.print(bar1_solved ? "YES" : "no");
    Serial.print(" bar2_solved:");   Serial.print(bar2_solved ? "YES" : "no");

    if (bar1_solved && bar2_solved) {
      solved_puzzle = true;
      Serial.println(" *** PUZZLE SOLVED ***");
    } else {
      Serial.println();
    }
  } else {
    Serial.println("Puzzle is solved. Waiting for remote reset...");
    delay(2000);
  }

  me.update();
}