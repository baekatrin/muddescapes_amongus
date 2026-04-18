#!/usr/bin/env node

/**
 * Arduino Serial to MQTT Bridge
 * Reads potentiometer values from ESP32 serial port and publishes to MQTT
 */

const mqtt = require("mqtt");
const SerialPort = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");

// Configuration
const SERIAL_PORT = "COM3"; // Change if your ESP32 is on a different port
const SERIAL_BAUD = 115200;

const MQTT_BROKER = "wss://broker.hivemq.com:8884/mqtt";
const MQTT_CLIENT_ID = `victor-bridge-${Math.random().toString(16).substr(2, 8)}`;
const MQTT_TOPICS = {
  bar1: "victor/bar1",
  bar2: "victor/bar2",
  solved: "victor/solved"
};

// MQTT Client
let mqttClient = null;
let serialPort = null;
let isConnected = false;

console.log("[INFO] Arduino Serial to MQTT Bridge Starting...");
console.log(`[INFO] Serial Port: ${SERIAL_PORT} @ ${SERIAL_BAUD} baud`);
console.log(`[INFO] MQTT Broker: ${MQTT_BROKER}`);

// Connect to MQTT
function connectMQTT() {
  console.log("[MQTT] Connecting to broker...");

  mqttClient = mqtt.connect(MQTT_BROKER, {
    clientId: MQTT_CLIENT_ID,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 30000
  });

  mqttClient.on("connect", () => {
    console.log("[MQTT] Connected successfully");
    isConnected = true;
    publishStatus("online");
  });

  mqttClient.on("disconnect", () => {
    console.log("[MQTT] Disconnected");
    isConnected = false;
  });

  mqttClient.on("error", (err) => {
    console.error("[MQTT] Error:", err.message);
  });

  mqttClient.on("offline", () => {
    console.log("[MQTT] Offline - attempting to reconnect...");
  });
}

function publishStatus(status) {
  if (mqttClient && isConnected) {
    mqttClient.publish("victor/bridge-status", status);
  }
}

function publishValue(topic, value) {
  if (mqttClient && isConnected) {
    mqttClient.publish(topic, value.toString());
    console.log(`[PUBLISH] ${topic}: ${value}`);
  }
}

// Expose solved state globally for web interface
let globalSolvedState = false;
function setSolvedState(state) {
  globalSolvedState = state;
  if (state) {
    console.log("[ARDUINO] Puzzle SOLVED!");
  }
}

// Connect to Serial Port
function connectSerial() {
  serialPort = new SerialPort.SerialPort({
    path: SERIAL_PORT,
    baudRate: SERIAL_BAUD
  });

  const parser = serialPort.pipe(new ReadlineParser({ delimiter: "\n" }));

  serialPort.on("open", () => {
    console.log(`[SERIAL] Connected to ${SERIAL_PORT}`);
  });

  serialPort.on("error", (err) => {
    console.error(`[SERIAL] Error: ${err.message}`);
    console.log("[SERIAL] Retrying in 5 seconds...");
    setTimeout(connectSerial, 5000);
  });

  serialPort.on("close", () => {
    console.log("[SERIAL] Port closed. Reconnecting...");
    setTimeout(connectSerial, 5000);
  });

  // Parse incoming serial data
  parser.on("data", (line) => {
    parseArduinoData(line.trim());
  });
}

function parseArduinoData(line) {
    console.log('[SERIAL] Raw data:', line);
  // Expected format: A1:1234 A2:2345 sumA:3579 dac1:128 | B1:2047 B2:2000 dac2:64 | bar1_solved:YES bar2_solved:YES

  // Extract DAC values (0-255) and convert to percentages (0-100)
  const dac1Match = line.match(/dac1:(\d+)/);
  const dac2Match = line.match(/dac2:(\d+)/);
  const bar1SolvedMatch = line.match(/bar1_solved:(YES|no)/);
  const bar2SolvedMatch = line.match(/bar2_solved:(YES|no)/);

  if (dac1Match) {
    const dac1 = parseInt(dac1Match[1]);
    const bar1Pct = Math.round((dac1 / 255) * 100);
    publishValue(MQTT_TOPICS.bar1, bar1Pct);
  }

  if (dac2Match) {
    const dac2 = parseInt(dac2Match[1]);
    const bar2Pct = Math.round((dac2 / 255) * 100);
    publishValue(MQTT_TOPICS.bar2, bar2Pct);
  }

  // Publish solved state (true only if BOTH bars solved)
  if (bar1SolvedMatch && bar2SolvedMatch) {
    const bar1Solved = bar1SolvedMatch[1] === "YES";
    const bar2Solved = bar2SolvedMatch[1] === "YES";
    const overallSolved = bar1Solved && bar2Solved;
    setSolvedState(overallSolved);
    publishValue(MQTT_TOPICS.solved, overallSolved ? "true" : "false");
  }
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[INFO] Shutting down...");
  if (serialPort && serialPort.isOpen) {
    serialPort.close();
  }
  if (mqttClient) {
    mqttClient.end();
  }
  process.exit(0);
});

// Start everything
connectMQTT();
connectSerial();
