import { useEffect, useMemo, useState, useCallback } from "react";
import * as api from "./services/api";
import { getAvailableCropNames, getLatestReading, analyseCrop, calculateFarmStatus } from "./utils/analysis";
import Header from "./components/Header";
import CropCard from "./components/CropCard";
import CropCardForm from "./components/CropCardForm";
import SensorHistory from "./components/SensorHistory";
import "./App.css";

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function App() {
  const [crops, setCrops] = useState([]);
  const [cropsStatus, setCropsStatus] = useState("loading"); // loading | error | loaded

  const [readings, setReadings] = useState(null);
  const [sensorAvailable, setSensorAvailable] = useState(false);
  const [lastRefresh, setLastRefresh] = useState("Never");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");

  const [banner, setBanner] = useState(null); // { type: 'success'|'error', text }
  const [showCreate, setShowCreate] = useState(false);
  const [editingCrop, setEditingCrop] = useState(null);
  const [historyCrop, setHistoryCrop] = useState(null);

  const loadCrops = useCallback(async () => {
    setCropsStatus("loading");
    try {
      const data = await api.getCrops();
      setCrops(data);
      setCropsStatus("loaded");
    } catch (err) {
      setCropsStatus("error");
    }
  }, []);

  const loadReadings = useCallback(async ({ isRefresh } = {}) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await api.getReadings();
      setReadings(data);
      setSensorAvailable(true);
      setLastRefresh(formatTime(new Date()));
      setRefreshError("");
    } catch (err) {
      if (!isRefresh) {
        // first load failure: no readings yet, keep lastRefresh = Never
        setSensorAvailable(false);
      } else {
        // later refresh failure: keep previous readings/lastRefresh, show banner
        setRefreshError(err.message || "Failed to refresh sensor data");
      }
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCrops();
    loadReadings();
  }, [loadCrops, loadReadings]);

  const results = useMemo(() => {
    return crops.map((crop) => {
      const reading = sensorAvailable ? getLatestReading(crop.crop_name, readings || []) : null;
      const analysis = analyseCrop(crop, reading);
      return { crop, latest_reading: reading, ...analysis };
    });
  }, [crops, readings, sensorAvailable]);

  const farmStatus = useMemo(
    () => calculateFarmStatus({ cropCount: crops.length, sensorAvailable, results }),
    [crops.length, sensorAvailable, results]
  );

  const availableCropNames = useMemo(
    () => (sensorAvailable ? getAvailableCropNames(readings || [], crops) : []),
    [readings, crops, sensorAvailable]
  );

  function showBanner(type, text) {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 4000);
  }

  async function handleCreate(formData) {
    const created = await api.createCrop(formData);
    setCrops((prev) => [...prev, created]);
    setShowCreate(false);
    showBanner("success", `${created.crop_name} card created.`);
  }

  async function handleEditSubmit(formData) {
    const updated = await api.updateCrop(editingCrop.id, formData);
    setCrops((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setEditingCrop(null);
    showBanner("success", `${updated.crop_name} card updated.`);
  }

  async function handleDelete(crop) {
    if (!window.confirm(`Delete the ${crop.crop_name} card? Sensor data will not be affected.`)) return;
    try {
      await api.deleteCrop(crop.id);
      setCrops((prev) => prev.filter((c) => c.id !== crop.id));
      showBanner("success", `${crop.crop_name} card deleted.`);
    } catch (err) {
      showBanner("error", err.message || "Failed to delete crop card");
    }
  }

  function handleRefresh() {
    loadReadings({ isRefresh: true });
  }

  if (cropsStatus === "loading") {
    return (
      <div className="app-shell">
        <p className="loading-message">Loading Crop Cards...</p>
      </div>
    );
  }

  if (cropsStatus === "error") {
    return (
      <div className="app-shell">
        <p className="error-message">Could not load Crop Cards.</p>
        <button onClick={loadCrops}>Retry</button>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Header
        farmStatus={farmStatus}
        cropCount={crops.length}
        lastRefresh={lastRefresh}
        onAdd={() => setShowCreate(true)}
        onRefresh={handleRefresh}
        addDisabled={!sensorAvailable}
        refreshing={refreshing}
      />

      {!sensorAvailable && (
        <div className="banner banner-error">
          Sensor feed unavailable. Crop Cards are shown with N/A sensor results.
        </div>
      )}
      {refreshError && (
        <div className="banner banner-error">{refreshError}</div>
      )}
      {banner && (
        <div className={`banner banner-${banner.type}`}>{banner.text}</div>
      )}

      {crops.length === 0 ? (
        <div className="empty-state">
          <p>No Crop Cards yet. Click "Add Crop Card" to create one.</p>
        </div>
      ) : (
        <div className="crop-grid">
          {results.map((result) => (
            <CropCard
              key={result.crop.id}
              crop={result.crop}
              result={result}
              sensorAvailable={sensorAvailable}
              onEdit={setEditingCrop}
              onDelete={handleDelete}
              onViewHistory={setHistoryCrop}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CropCardForm
          mode="create"
          availableCropNames={availableCropNames}
          initialValues={null}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {editingCrop && (
        <CropCardForm
          mode="edit"
          availableCropNames={[]}
          initialValues={editingCrop}
          onSubmit={handleEditSubmit}
          onCancel={() => setEditingCrop(null)}
        />
      )}

      {historyCrop && (
        <SensorHistory
          crop={historyCrop}
          readings={readings || []}
          onClose={() => setHistoryCrop(null)}
        />
      )}
    </div>
  );
}
