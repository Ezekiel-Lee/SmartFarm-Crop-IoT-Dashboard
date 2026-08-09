// All dashboard business logic lives here so that both the crop card grid
// and the Sensor History view call the exact same functions (Section 12).

/**
 * Unique crop_name values from the sensor feed that do not already have a
 * Crop Card. Used to build the Create dropdown.
 */
export function getAvailableCropNames(readings, crops) {
  if (!Array.isArray(readings)) return [];
  const usedNames = new Set((crops || []).map((c) => c.crop_name));
  const uniqueNames = [...new Set(readings.map((r) => r.crop_name))];
  return uniqueNames.filter((name) => !usedNames.has(name));
}

/**
 * The single reading with the greatest timestamp for a given crop_name.
 * crop_name matching is exact and case-sensitive (=== is case-sensitive).
 * Timestamps use a fixed YYYY-MM-DDTHH:mm:ss format, so string comparison
 * sorts them correctly without parsing into Date objects.
 */
export function getLatestReading(cropName, readings) {
  if (!Array.isArray(readings)) return null;
  const matches = readings.filter((r) => r.crop_name === cropName);
  if (matches.length === 0) return null;
  return [...matches].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
}

const isInRange = (value, min, max) => typeof value === "number" && value >= min && value <= max;

/**
 * Applies the Section 10 decision table to one Crop Card + its latest
 * (or historical, for Sensor History) reading.
 *
 * Returns: { condition, recommended_water, alerts, action, invalidFields }
 */
export function analyseCrop(cropCard, reading) {
  if (!reading) {
    return {
      condition: "No Data",
      recommended_water: null,
      alerts: [],
      action: "N/A",
      invalidFields: [],
    };
  }

  const { soil_moisture, temperature, rainfall, sensor_status } = reading;

  // Priority 1: sensor problem
  if (sensor_status === "Offline" || sensor_status === "Faulty") {
    return {
      condition: "Sensor Problem",
      recommended_water: null,
      alerts: ["Check sensor"],
      action: "Check sensor",
      invalidFields: [],
    };
  }

  // Priority 2: invalid data (Online reading, out-of-range numeric value)
  const invalidFields = [];
  if (!isInRange(soil_moisture, 0, 100)) invalidFields.push("soil_moisture");
  if (!isInRange(temperature, 0, 50)) invalidFields.push("temperature");
  if (!isInRange(rainfall, 0, 50)) invalidFields.push("rainfall");

  if (invalidFields.length > 0) {
    return {
      condition: "Invalid Data",
      recommended_water: null,
      alerts: ["Invalid Data"],
      action: "Check reading",
      invalidFields,
    };
  }

  // Priorities 3-5: Dry / Healthy / Too Wet
  const { target_min, target_max, normal_water } = cropCard;
  let condition;
  let recommended_water;
  let action;

  if (soil_moisture < target_min) {
    condition = "Dry";
    recommended_water = normal_water;
    action = "Water crop";
  } else if (soil_moisture > target_max) {
    condition = "Too Wet";
    recommended_water = 0;
    action = "Stop watering";
  } else {
    condition = "Healthy";
    recommended_water = 0;
    action = "Monitor";
  }

  // Additional alerts (valid Online reading only, do not change recommended water)
  const alerts = [];
  if (temperature > 35) alerts.push("High temperature");
  if (rainfall >= 5) alerts.push("Rain detected");

  return { condition, recommended_water, alerts, action, invalidFields: [] };
}

/**
 * Overall Farm Status, derived only from the current Crop Cards and their
 * analysed results (Section 10). "results" is an array of the objects
 * returned by analyseCrop, one per Crop Card.
 */
export function calculateFarmStatus({ cropCount, sensorAvailable, results }) {
  if (cropCount === 0) return "No Crops";
  if (!sensorAvailable) return "Sensor Feed Unavailable";

  const hasCritical = results.some(
    (r) => r.condition === "Sensor Problem" || r.condition === "Invalid Data"
  );
  if (hasCritical) return "Critical";

  const hasWatch = results.some(
    (r) =>
      r.condition === "Dry" ||
      r.condition === "Too Wet" ||
      (r.alerts || []).includes("High temperature")
  );
  if (hasWatch) return "Watch";

  return "Normal";
}
