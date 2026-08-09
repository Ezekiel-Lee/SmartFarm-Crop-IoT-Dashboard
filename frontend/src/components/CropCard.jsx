const conditionClass = {
  Dry: "condition-dry",
  Healthy: "condition-healthy",
  "Too Wet": "condition-too-wet",
  "Sensor Problem": "condition-problem",
  "Invalid Data": "condition-problem",
  "No Data": "condition-unknown",
};

export default function CropCard({ crop, result, sensorAvailable, onEdit, onDelete, onViewHistory }) {
  const { condition, recommended_water, alerts, action, invalidFields } = result;
  const reading = result.latest_reading;

  return (
    <div className={`crop-card ${conditionClass[condition] || ""}`}>
      <div className="crop-card-header">
        <h3>{crop.crop_name}</h3>
        <span className="crop-location">{crop.location}</span>
      </div>

      {!sensorAvailable && (
        <p className="sensor-na">Sensor data unavailable — showing N/A</p>
      )}

      {sensorAvailable && reading && (
        <div className="reading-block">
          <p className="reading-line">Latest: {reading.timestamp}</p>
          <p className="reading-line">Moisture: {reading.soil_moisture}%</p>
          <p className="reading-line">Temperature: {reading.temperature} C</p>
          <p className="reading-line">Rainfall: {reading.rainfall} mm</p>
        </div>
      )}

      <p className="condition-line">
        Condition: <strong>{sensorAvailable ? condition : "N/A"}</strong>
      </p>
      <p className="reading-line">
        Recommended: {!sensorAvailable ? "N/A" : recommended_water === null ? "N/A" : `${recommended_water} L`}
      </p>
      {sensorAvailable && invalidFields && invalidFields.length > 0 && (
        <p className="reading-line invalid-field">Invalid field(s): {invalidFields.join(", ")}</p>
      )}
      {sensorAvailable && alerts && alerts.length > 0 && (
        <p className="alert-line">Alert: {alerts.join(", ")}</p>
      )}
      <p className="reading-line">Action: {sensorAvailable ? action : "N/A"}</p>

      <div className="crop-card-settings">
        <p>Target: {crop.target_min}% - {crop.target_max}%</p>
        <p>Normal water: {crop.normal_water} L</p>
        {crop.notes && <p>Notes: {crop.notes}</p>}
      </div>

      <div className="crop-card-actions">
        <button onClick={() => onEdit(crop)}>Edit</button>
        <button onClick={() => onDelete(crop)} className="danger">Delete</button>
        <button onClick={() => onViewHistory(crop)}>View Sensor History</button>
      </div>
    </div>
  );
}
