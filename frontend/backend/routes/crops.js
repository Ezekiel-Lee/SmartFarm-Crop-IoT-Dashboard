const express = require("express");
const fs = require("fs");
const path = require("path");
const { db } = require("../db");
const { validateReadingsStructure } = require("../validateReadings");

const router = express.Router();
const READINGS_PATH = path.join(__dirname, "..", "data", "sensor-readings.json");

function isNumber(v) {
  return typeof v === "number" && Number.isFinite(v);
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

// Reads and structurally validates the sensor file, returning the set of
// unique, valid crop_name values it contains. Used only to check that a
// crop_name entered on Create actually exists in the read-only sensor feed.
function getValidCropNamesFromSensorFile() {
  const raw = fs.readFileSync(READINGS_PATH, "utf-8");
  const data = JSON.parse(raw);
  const result = validateReadingsStructure(data);
  if (!result.valid) {
    const err = new Error("Sensor data file is invalid");
    err.code = "SENSOR_FILE_INVALID";
    throw err;
  }
  return new Set(data.map((r) => r.crop_name));
}

// Validates the shared Create/Edit fields (excluding crop_name rules, which
// differ between Create and Edit and are handled by the caller).
// Returns an error message string, or null if the body is valid.
function validateCropFields(body, { requireAll }) {
  if (requireAll || Object.prototype.hasOwnProperty.call(body, "location")) {
    if (!isNonEmptyString(body.location) || body.location.length > 100) {
      return "location is required";
    }
  }

  if (requireAll || Object.prototype.hasOwnProperty.call(body, "target_min")) {
    if (!isNumber(body.target_min) || body.target_min < 0 || body.target_min > 100) {
      return "target_min must be a number between 0 and 100";
    }
  }

  if (requireAll || Object.prototype.hasOwnProperty.call(body, "target_max")) {
    if (!isNumber(body.target_max) || body.target_max < 0 || body.target_max > 100) {
      return "target_max must be a number between 0 and 100";
    }
  }

  const min = requireAll ? body.target_min : body.target_min;
  const max = requireAll ? body.target_max : body.target_max;
  if (isNumber(min) && isNumber(max) && min >= max) {
    return "target_min must be less than target_max";
  }

  if (requireAll || Object.prototype.hasOwnProperty.call(body, "normal_water")) {
    if (!isNumber(body.normal_water) || body.normal_water <= 0 || body.normal_water > 10000) {
      return "normal_water must be a number greater than 0 and at most 10000";
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "notes") && body.notes !== undefined && body.notes !== null) {
    if (typeof body.notes !== "string" || body.notes.length > 500) {
      return "notes must be a string up to 500 characters";
    }
  }

  return null;
}

// GET /api/crops
router.get("/", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM crops ORDER BY id ASC").all();
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/crops/:id
router.get("/:id", (req, res) => {
  try {
    const row = db.prepare("SELECT * FROM crops WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "Crop card not found" });
    res.status(200).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/crops
router.post("/", (req, res) => {
  try {
    const body = req.body || {};

    if (!isNonEmptyString(body.crop_name)) {
      return res.status(400).json({ error: "crop_name is required" });
    }

    const fieldError = validateCropFields(body, { requireAll: true });
    if (fieldError) return res.status(400).json({ error: fieldError });

    let validCropNames;
    try {
      validCropNames = getValidCropNamesFromSensorFile();
    } catch (err) {
      if (err.code === "SENSOR_FILE_INVALID") {
        return res.status(500).json({ error: "Sensor data file is invalid" });
      }
      throw err;
    }

    if (!validCropNames.has(body.crop_name)) {
      return res.status(400).json({ error: "crop_name does not exist in sensor data" });
    }

    const existing = db.prepare("SELECT id FROM crops WHERE crop_name = ?").get(body.crop_name);
    if (existing) {
      return res.status(409).json({ error: "crop_name already exists" });
    }

    const notes = typeof body.notes === "string" ? body.notes : "";

    const insert = db.prepare(`
      INSERT INTO crops (crop_name, location, target_min, target_max, normal_water, notes)
      VALUES (@crop_name, @location, @target_min, @target_max, @normal_water, @notes)
    `);
    const info = insert.run({
      crop_name: body.crop_name,
      location: body.location,
      target_min: body.target_min,
      target_max: body.target_max,
      normal_water: body.normal_water,
      notes,
    });

    const created = db.prepare("SELECT * FROM crops WHERE id = ?").get(info.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/crops/:id
router.put("/:id", (req, res) => {
  try {
    const existing = db.prepare("SELECT * FROM crops WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Crop card not found" });

    const body = req.body || {};

    if (Object.prototype.hasOwnProperty.call(body, "crop_name")) {
      if (body.crop_name !== existing.crop_name) {
        return res.status(400).json({ error: "crop_name cannot be changed" });
      }
    }

    const fieldError = validateCropFields(body, { requireAll: true });
    if (fieldError) return res.status(400).json({ error: fieldError });

    const notes = typeof body.notes === "string" ? body.notes : "";

    db.prepare(`
      UPDATE crops
      SET location = @location,
          target_min = @target_min,
          target_max = @target_max,
          normal_water = @normal_water,
          notes = @notes
      WHERE id = @id
    `).run({
      id: req.params.id,
      location: body.location,
      target_min: body.target_min,
      target_max: body.target_max,
      normal_water: body.normal_water,
      notes,
    });

    const updated = db.prepare("SELECT * FROM crops WHERE id = ?").get(req.params.id);
    res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/crops/:id
router.delete("/:id", (req, res) => {
  try {
    const existing = db.prepare("SELECT id FROM crops WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Crop card not found" });

    db.prepare("DELETE FROM crops WHERE id = ?").run(req.params.id);
    res.status(200).json({ deleted: true, id: Number(req.params.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
