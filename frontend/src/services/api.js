const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch (networkErr) {
    throw new Error("Could not reach the SmartFarm server. Is the backend running?");
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    // no JSON body (shouldn't normally happen given our error contract)
  }

  if (!res.ok) {
    const message = body && body.error ? body.error : `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  return body;
}

export const getCrops = () => request("/api/crops");
export const getCrop = (id) => request(`/api/crops/${id}`);
export const createCrop = (data) =>
  request("/api/crops", { method: "POST", body: JSON.stringify(data) });
export const updateCrop = (id, data) =>
  request(`/api/crops/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteCrop = (id) => request(`/api/crops/${id}`, { method: "DELETE" });
export const getReadings = () => request("/api/readings");
