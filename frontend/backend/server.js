const express = require("express");
const cors = require("cors");
const { init } = require("./db");
const cropsRouter = require("./routes/crops");
const readingsRouter = require("./routes/readings");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialise SQLite (create table + seed Tomato/Lettuce/Wheat if empty)
init();

app.use("/api/crops", cropsRouter);
app.use("/api/readings", readingsRouter);

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// 404 for unknown routes — still uses the {"error": "..."} contract
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Central error handler (e.g. malformed JSON body from express.json())
app.use((err, req, res, next) => {
  console.error(err);
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body must be valid JSON" });
  }
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`SmartFarm backend listening on http://localhost:${PORT}`);
});

module.exports = app;
