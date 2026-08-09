const express = require("express");
const fs = require("fs");
const path = require("path");
const { validateReadingsStructure } = require("../validateReadings");

const router = express.Router();
const READINGS_PATH = path.join(__dirname, "..", "data", "sensor-readings.json");

// GET /api/readings
// Reads the file fresh on every request (so a manual file replacement is
// picked up without restarting the server), structurally validates it,
// and returns the raw readings unchanged. No analysis happens here.
router.get("/", (req, res) => {
  let raw;
  try {
    raw = fs.readFileSync(READINGS_PATH, "utf-8");
  } catch (err) {
    console.error("Failed to read sensor-readings.json:", err.message);
    return res.status(500).json({ error: "Sensor data file is invalid" });
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse sensor-readings.json:", err.message);
    return res.status(500).json({ error: "Sensor data file is invalid" });
  }

  const result = validateReadingsStructure(data);
  if (!result.valid) {
    console.error("Sensor data structural validation failed:", result.reason);
    return res.status(500).json({ error: "Sensor data file is invalid" });
  }

  return res.status(200).json(data);
});

module.exports = router;
