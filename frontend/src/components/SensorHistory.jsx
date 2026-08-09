import { analyseCrop } from "../utils/analysis";

// Shows all readings for one crop, newest first, each analysed with the
// same analyseCrop function used by the dashboard cards (Section 12/15).
export default function SensorHistory({ crop, readings, onClose }) {
  const cropReadings = readings
    .filter((r) => r.crop_name === crop.crop_name)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return (
    <div className="modal-backdrop">
      <div className="modal modal-wide">
        <h2>Sensor History — {crop.crop_name}</h2>
        <table className="history-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Moisture</th>
              <th>Temp</th>
              <th>Rainfall</th>
              <th>Status</th>
              <th>Condition</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {cropReadings.map((r) => {
              const result = analyseCrop(crop, r);
              return (
                <tr key={r.timestamp}>
                  <td>{r.timestamp}</td>
                  <td>{r.soil_moisture}%</td>
                  <td>{r.temperature} C</td>
                  <td>{r.rainfall} mm</td>
                  <td>{r.sensor_status}</td>
                  <td>{result.condition}</td>
                  <td>{r.notes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="modal-actions">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
