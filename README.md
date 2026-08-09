# SmartFarm Crop IoT Dashboard

A full-stack crop dashboard for GreenFields Farm. React (Vite) frontend, Node/Express backend, SQLite for Crop Cards, and a read-only simulated JSON sensor feed, joined in the browser by `crop_name`.

## 1. Installation and run steps

Requires Node.js 18+ (developed and tested on Node 22).

```bash
# Backend
cd backend
npm install
npm start          # or: node server.js

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

The backend creates and seeds `backend/smartfarm.db` automatically on first start (see Section 4). Deleting that file resets the database — the three seed cards will be re-inserted on the next start.

### URLs

- Backend (Express API): **http://localhost:3001**
- Frontend (React/Vite dev server): **http://localhost:5173**

The frontend calls the backend at `http://localhost:3001` by default (see `frontend/src/services/api.js`). Override with a `VITE_API_URL` environment variable if the backend runs on a different port. CORS is enabled on the backend (`cors()` in `server.js`) so the two dev servers can talk to each other on different origins.

## 2. Database creation and seeding

- `backend/db.js` creates the `crops` table on startup if it does not already exist (schema matches Section 17 of the brief exactly, including the `CHECK` constraints on `crop_name`, `target_min`, `target_max`, `normal_water`, and `target_min < target_max`).
- If the table is **empty**, it seeds exactly three cards: **Tomato, Lettuce, Wheat**. **Maize is intentionally not seeded**, so a marker can immediately test Create.
- Restarting the backend does not duplicate rows — seeding only runs when `COUNT(*) = 0`.
- To reset during development/marking: stop the backend and delete `backend/smartfarm.db`, then start the backend again.

## 3. API routes and error format

| Method & route | Purpose | Success |
|---|---|---|
| `GET /api/crops` | All Crop Cards | 200 + array |
| `GET /api/crops/:id` | One Crop Card | 200 + object |
| `POST /api/crops` | Create a Crop Card | 201 + created object |
| `PUT /api/crops/:id` | Update a Crop Card (crop_name immutable) | 200 + updated object |
| `DELETE /api/crops/:id` | Delete a Crop Card only | 200 + `{"deleted":true,"id":n}` |
| `GET /api/readings` | Read + structurally validate sensor JSON | 200 + array |

Every failure uses the same JSON shape: `{"error": "message"}`. Examples implemented exactly as specified: missing/invalid field → 400, `crop_name` not in the sensor feed → 400, attempt to change `crop_name` → 400, duplicate `crop_name` → 409, unknown id → 404, structurally invalid sensor file → 500 `{"error":"Sensor data file is invalid"}`, unexpected server error → 500 `{"error":"Internal server error"}`.

Request bodies must send `target_min`, `target_max`, and `normal_water` as JSON numbers — numeric strings are rejected with 400.

## 4. Data ownership

| Data | Lives in | Who changes it |
|---|---|---|
| Crop Cards | SQLite `crops` table | User, via Create/Edit/Delete |
| Sensor readings | `backend/data/sensor-readings.json` | Nobody — read-only inside the app |
| Dashboard results (condition, recommended water, alerts, Overall Farm Status) | React state only | Calculated automatically, never stored |

The backend never returns a calculated condition or recommendation, and never writes to the sensor JSON file. All CRUD, delete, and re-create operations on a Crop Card leave the sensor readings completely unchanged (verified — see Section 6).

## 5. crop_name matching and latest-timestamp selection

`crop_name` is the single join key between a Crop Card and the sensor feed. Matching is an exact, case-sensitive string comparison (`===`) — `Tomato` does not match `tomato`.

For a given crop, the "latest" reading is the one with the greatest timestamp among *that crop's* readings only, not the last object in the JSON array (the array is deliberately shuffled so this can't be gamed). Because every timestamp uses the fixed format `YYYY-MM-DDTHH:mm:ss`, string comparison sorts correctly:

```js
function getLatestReading(cropName, readings) {
  const matches = readings.filter(r => r.crop_name === cropName);
  return [...matches].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0] ?? null;
}
```

This lives in `frontend/src/utils/analysis.js` and is the only implementation used anywhere in the app (dashboard cards and Sensor History both call it).

## 6. Dashboard decision priority

Implemented in `analyseCrop()` (`frontend/src/utils/analysis.js`), applied top to bottom, first match wins:

1. `sensor_status` is `Offline` or `Faulty` → **Sensor Problem** (water = N/A, action = Check sensor).
2. Online reading with `soil_moisture` outside 0–100, `temperature` outside 0–50, or `rainfall` outside 0–50 → **Invalid Data** (water = N/A, invalid field named, action = Check reading).
3. `soil_moisture < target_min` → **Dry** (water = normal_water, action = Water crop).
4. `target_min <= soil_moisture <= target_max` → **Healthy** (water = 0 L, action = Monitor).
5. `soil_moisture > target_max` → **Too Wet** (water = 0 L, action = Stop watering).

Additional alerts (valid Online reading only, don't change recommended water): temperature > 35 °C → "High temperature"; rainfall ≥ 5 mm → "Rain detected".

Overall Farm Status (`calculateFarmStatus()`): **No Crops** if there are zero Crop Cards; else **Sensor Feed Unavailable** if no sensor request has ever succeeded; else **Critical** if any card is Sensor Problem or Invalid Data; else **Watch** if any card is Dry, Too Wet, or has a High temperature alert; else **Normal**.

## 7. AI use



## 8. Limitation

The app assumes the sensor file always contains exactly five readings per crop (as required by validation), so it does not implement a "No Data" dashboard state — if a future sensor feed intentionally shipped fewer readings for a crop, the backend would (correctly, per the brief) reject the whole file as structurally invalid rather than showing a partial dashboard.

## Project structure

```
smartfarm/
  backend/
    server.js            Express app, routes, error handler
    db.js                 SQLite schema + seed
    validateReadings.js  Structural validation of sensor-readings.json
    routes/crops.js       Crop Card CRUD
    routes/readings.js    GET /api/readings
    data/sensor-readings.json
  frontend/
    src/
      App.jsx
      components/        Header, CropCard, CropCardForm, SensorHistory
      services/api.js     fetch wrapper for the backend
      utils/analysis.js   getAvailableCropNames, getLatestReading, analyseCrop, calculateFarmStatus
```

## Note on the AI acknowledgement form

Per the LMS assessment page, an AI acknowledgement form must be completed and submitted separately before this submission will be accepted — that form is not part of this repository and needs to be filled in by the student.
