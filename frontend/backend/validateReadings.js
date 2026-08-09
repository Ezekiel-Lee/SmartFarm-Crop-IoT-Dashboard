// Structural validation of the sensor-readings.json feed.
// This module answers ONE question only: is the file structurally valid?
// It does NOT decide Dry / Healthy / Invalid Data — that is frontend analysis.

const ALLOWED_CROPS = ["Tomato", "Lettuce", "Wheat", "Maize"];
const ALLOWED_STATUS = ["Online", "Offline", "Faulty"];
const REQUIRED_FIELDS = [
  "crop_name",
  "timestamp",
  "soil_moisture",
  "temperature",
  "rainfall",
  "sensor_status",
  "notes",
];
const TIMESTAMP_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

function isValidTimestamp(value) {
  if (typeof value !== "string" || !TIMESTAMP_REGEX.test(value)) return false;
  // Confirm it is a real calendar date-time (rejects e.g. 2026-13-40T99:99:99)
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day &&
    d.getUTCHours() === hour &&
    d.getUTCMinutes() === minute &&
    d.getUTCSeconds() === second
  );
}

/**
 * Validates the structural shape of the sensor readings file.
 * Returns { valid: true } or { valid: false, reason: "..." } for logging/debugging.
 * The API route only ever exposes the generic {"error":"Sensor data file is invalid"} message.
 */
function validateReadingsStructure(data) {
  if (!Array.isArray(data)) {
    return { valid: false, reason: "Top-level JSON value is not an array" };
  }

  if (data.length !== 20) {
    return { valid: false, reason: `Expected exactly 20 readings, found ${data.length}` };
  }

  const cropCounts = { Tomato: 0, Lettuce: 0, Wheat: 0, Maize: 0 };
  const timestampsByCrop = { Tomato: new Set(), Lettuce: new Set(), Wheat: new Set(), Maize: new Set() };

  for (let i = 0; i < data.length; i++) {
    const reading = data[i];

    if (typeof reading !== "object" || reading === null || Array.isArray(reading)) {
      return { valid: false, reason: `Reading at index ${i} is not an object` };
    }

    const keys = Object.keys(reading);
    const hasExactFields =
      REQUIRED_FIELDS.every((f) => Object.prototype.hasOwnProperty.call(reading, f)) &&
      keys.length === REQUIRED_FIELDS.length;
    if (!hasExactFields) {
      return { valid: false, reason: `Reading at index ${i} does not have exactly the required fields` };
    }

    if (!ALLOWED_CROPS.includes(reading.crop_name)) {
      return { valid: false, reason: `Reading at index ${i} has invalid crop_name` };
    }

    if (!isValidTimestamp(reading.timestamp)) {
      return { valid: false, reason: `Reading at index ${i} has an invalid timestamp` };
    }

    if (typeof reading.soil_moisture !== "number" || Number.isNaN(reading.soil_moisture)) {
      return { valid: false, reason: `Reading at index ${i} has non-numeric soil_moisture` };
    }
    if (typeof reading.temperature !== "number" || Number.isNaN(reading.temperature)) {
      return { valid: false, reason: `Reading at index ${i} has non-numeric temperature` };
    }
    if (typeof reading.rainfall !== "number" || Number.isNaN(reading.rainfall)) {
      return { valid: false, reason: `Reading at index ${i} has non-numeric rainfall` };
    }

    if (!ALLOWED_STATUS.includes(reading.sensor_status)) {
      return { valid: false, reason: `Reading at index ${i} has invalid sensor_status` };
    }

    if (typeof reading.notes !== "string") {
      return { valid: false, reason: `Reading at index ${i} has non-string notes` };
    }

    cropCounts[reading.crop_name] += 1;

    const cropTimestamps = timestampsByCrop[reading.crop_name];
    if (cropTimestamps.has(reading.timestamp)) {
      return {
        valid: false,
        reason: `Duplicate timestamp "${reading.timestamp}" for crop "${reading.crop_name}"`,
      };
    }
    cropTimestamps.add(reading.timestamp);
  }

  for (const crop of ALLOWED_CROPS) {
    if (cropCounts[crop] !== 5) {
      return { valid: false, reason: `Expected exactly 5 readings for ${crop}, found ${cropCounts[crop]}` };
    }
  }

  return { valid: true };
}

module.exports = { validateReadingsStructure };
