const statusClass = {
  Normal: "status-normal",
  Watch: "status-watch",
  Critical: "status-critical",
  "No Crops": "status-unknown",
  "Sensor Feed Unavailable": "status-unknown",
};

export default function Header({
  farmStatus,
  cropCount,
  lastRefresh,
  onAdd,
  onRefresh,
  addDisabled,
  refreshing,
}) {
  return (
    <header className="app-header">
      <div className="app-header-top">
        <h1>SmartFarm Crop Dashboard</h1>
        <div className={`farm-status ${statusClass[farmStatus] || ""}`}>
          Overall Status: {farmStatus}
        </div>
      </div>
      <div className="app-header-meta">
        <span>Crop cards: {cropCount}</span>
        <span>Last sensor refresh: {lastRefresh}</span>
      </div>
      <div className="app-header-actions">
        <button onClick={onAdd} disabled={addDisabled} title={addDisabled ? "Sensor feed unavailable" : ""}>
          Add Crop Card
        </button>
        <button onClick={onRefresh} disabled={refreshing}>
          {refreshing ? "Refreshing..." : "Refresh Sensor Data"}
        </button>
      </div>
    </header>
  );
}
