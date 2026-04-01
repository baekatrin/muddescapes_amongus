#include <Arduino.h>
#include <muddescapes.h>

// =============================================================================
// PUZZLE: "Signal Quality" – Video Feed Calibration
//
// HARDWARE:
//   4x sliding linear potentiometers
//   2x LM3914 LED bar graph drivers (bar mode: MODE pin tied to V+)
//   2x 10-segment LED bar graphs
//   ESP32 Feather Huzzah
//
// PUZZLE RULES:
//
//   BAR GRAPH 1 (A1 + A2) — "Gain"
//     The bar fills as the sum of A1+A2 rises toward a target window.
//     If the sum goes ABOVE the target window, the bar drops back down.
//     Only landing in the sweet spot fills the bar completely.
//     Think of it like tuning a radio — too little or too much = bad signal.
//
//     Target window center: ~60% of MAX_SUM  (≈ 4914 out of 8190)
//     Sweet spot half-width: ±5% of MAX_SUM  (≈ ±409 counts)
//     So full-bar zone: roughly 4505–5323
//     Outside that range the bar is visibly less than full.
//
//   BAR GRAPH 2 (B1 vs B2) — "Balance"
//     The bar shows the worst-case deviation of either B pot from a target.
//     Bar fully dark = both B1 and B2 are independently near TARGET_POT_B.
//     Bar lights up whenever either pot drifts from that position.
//     The player must find and hold the one exact configuration.
//
//     Target value for each pot: ~50% of MAX_ADC (≈ 2047)
//     Tolerance per pot: ±150 ADC counts (~3.7% of travel)
//
// SOLVED:
//   Bar 1 fully lit  AND Bar 2 fully dark simultaneously.
//
// PIN WIRING:
//   Pot A1 wiper  → GPIO 34 (ADC1 ch6)
//   Pot A2 wiper  → GPIO 39 (ADC1 ch7)
//   Pot B1 wiper  → GPIO 36 (ADC1 ch4)
//   Pot B2 wiper  → GPIO 34 (ADC1 ch5)
//   DAC output 1  → GPIO 25 → LM3914 #1 VIN
//   DAC output 2  → GPIO 26 → LM3914 #2 VIN
//

void solve_puzzle();
void reset_puzzle();

bool solved_puzzle = false;

// --- ADC input pins (ADC1 only — ADC2 is disabled when WiFi is active) ---
// Feather Huzzah32 labels: A2=GPIO34, A3=GPIO39, A4=GPIO36, A5=GPIO4
const int POT_A1_PIN = 34;  // A2
const int POT_A2_PIN = 39;  // A3
const int POT_B1_PIN = 36;  // A4
const int POT_B2_PIN = 4;   // A5

// --- DAC output pins (ESP32 onboard 8-bit DAC, 0–3.3 V) ---
const int DAC_BAR1_PIN = 25;
const int DAC_BAR2_PIN = 26;

// --- ADC range ---
const int MAX_ADC = 4095;
const int MAX_SUM = MAX_ADC * 2;  // 8190 (two pots summed)

// --- Noise smoothing ---
const int SMOOTH_SAMPLES = 8;

// =============================================================================
// BAR 1 TUNING — Sweet Spot Window
//
// DAC output is a triangle function of sumA, peaking at TARGET_SUM_A.
// Sliding either pot too far past the sweet spot causes the bar to retreat.
// Full bar is only achieved when sumA is within SWEET_SPOT_HALF_WIDTH_A
// of the target — that is the "Goldilocks zone."
// =============================================================================
const int TARGET_SUM_A            = (int)(MAX_SUM * 0.60f);  // 4914
const int SWEET_SPOT_HALF_WIDTH_A = (int)(MAX_SUM * 0.05f);  // 409  (±5%)

// =============================================================================
// BAR 2 TUNING — Specific Position Match
//
// Each B pot must independently land near TARGET_POT_B.
// The bar reflects the worst-case deviation across both pots.
// Both in tolerance simultaneously → bar dark → bar 2 solved.
// =============================================================================
const int TARGET_POT_B    = (int)(MAX_ADC * 0.50f);  // 2047  (midpoint)
const int POT_TOLERANCE_B = 150;                       // ±150 counts (~3.7%)

// --- Bar 1 DAC threshold to count as "solved" (accounts for ADC noise) ---
const uint8_t BAR1_SOLVED_THRESHOLD = 245;

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

// Average SMOOTH_SAMPLES readings to reduce ADC noise.
int smoothAnalogRead(int pin) {
  long total = 0;
  for (int i = 0; i < SMOOTH_SAMPLES; i++) {
    total += analogRead(pin);
    delayMicroseconds(50);
  }
  return (int)(total / SMOOTH_SAMPLES);
}

// Bar 1: triangle DAC output.
// sumA == TARGET_SUM_A → DAC 255 (full bar)
// sumA drifts away in either direction → DAC falls toward 0
uint8_t computeBar1Dac(int sumA) {
  sumA = constrain(sumA, 0, MAX_SUM);
  int distance = abs(sumA - TARGET_SUM_A);
  // Use the longer arm from target to either extreme as the falloff scale.
  int scale = max(TARGET_SUM_A, MAX_SUM - TARGET_SUM_A);
  int dac = map(distance, 0, scale, 255, 0);
  return (uint8_t)constrain(dac, 0, 255);
}

// Bar 2: average deviation of both B pots from TARGET_POT_B.
// Both pots on-target → DAC 0 (bar dark)
// Moving either pot closer to target always visibly dims the bar,
// giving the player continuous feedback from both sliders.
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
  dacWrite(DAC_BAR1_PIN, 255);  // Show bar 1 full
  dacWrite(DAC_BAR2_PIN, 0);   // Show bar 2 dark
}

void reset_puzzle() {
  solved_puzzle = false;
  // DAC control automatically returns to loop() on the next iteration
}

// =============================================================================
// SETUP
// =============================================================================

void setup() {
  delay(1000);

  analogReadResolution(12);        // 12-bit ADC: 0–4095
  analogSetAttenuation(ADC_11db);  // Full 0–3.3 V input range on all ADC pins

  dacWrite(DAC_BAR1_PIN, 0);
  dacWrite(DAC_BAR2_PIN, 0);  me.init(
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

    // --- Compute DAC values from puzzle rules ---
    uint8_t dac1 = computeBar1Dac(sumA);
    uint8_t dac2 = computeBar2Dac(b1, b2);

    // --- Drive the LM3914 chips ---
    dacWrite(DAC_BAR1_PIN, dac1);
    dacWrite(DAC_BAR2_PIN, dac2);

    // --- Check solved condition ---
    bool bar1_solved = (dac1 >= BAR1_SOLVED_THRESHOLD);
    bool bar2_solved = (abs(b1 - TARGET_POT_B) <= POT_TOLERANCE_B &&
                        abs(b2 - TARGET_POT_B) <= POT_TOLERANCE_B);

    if (bar1_solved && bar2_solved) {
      solved_puzzle = true;
    }
  }

  me.update();
}