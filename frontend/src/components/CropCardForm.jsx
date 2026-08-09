import { useState } from "react";

// Shared form used by both Create and Edit. In Create mode crop_name is a
// dropdown of available (unused) sensor crop names. In Edit mode crop_name
// is displayed read-only, per Section 6 (crop_name is immutable after Create).
export default function CropCardForm({ mode, availableCropNames, initialValues, onSubmit, onCancel }) {
  const isEdit = mode === "edit";

  const [cropName, setCropName] = useState(initialValues?.crop_name || "");
  const [location, setLocation] = useState(initialValues?.location || "");
  const [targetMin, setTargetMin] = useState(initialValues?.target_min ?? "");
  const [targetMax, setTargetMax] = useState(initialValues?.target_max ?? "");
  const [normalWater, setNormalWater] = useState(initialValues?.normal_water ?? "");
  const [notes, setNotes] = useState(initialValues?.notes || "");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    if (!isEdit && !cropName) return "Please select a crop name";
    if (!location || location.trim().length === 0 || location.length > 100) {
      return "Location is required (1-100 characters)";
    }
    const min = Number(targetMin);
    const max = Number(targetMax);
    const water = Number(normalWater);
    if (targetMin === "" || Number.isNaN(min) || min < 0 || min > 100) {
      return "Target min must be a number between 0 and 100";
    }
    if (targetMax === "" || Number.isNaN(max) || max < 0 || max > 100) {
      return "Target max must be a number between 0 and 100";
    }
    if (min >= max) return "Target min must be less than target max";
    if (normalWater === "" || Number.isNaN(water) || water <= 0 || water > 10000) {
      return "Normal water must be a number greater than 0 and at most 10000";
    }
    if (notes && notes.length > 500) return "Notes must be 500 characters or fewer";
    return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      await onSubmit({
        crop_name: cropName,
        location: location.trim(),
        target_min: Number(targetMin),
        target_max: Number(targetMax),
        normal_water: Number(normalWater),
        notes: notes || "",
      });
    } catch (err) {
      setFormError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>{isEdit ? `Edit ${cropName}` : "Add Crop Card"}</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Crop name
            {isEdit ? (
              <input value={cropName} readOnly disabled />
            ) : (
              <select value={cropName} onChange={(e) => setCropName(e.target.value)}>
                <option value="">-- select a crop --</option>
                {availableCropNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            )}
          </label>

          <label>
            Location
            <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={100} />
          </label>

          <label>
            Target min (%)
            <input type="number" value={targetMin} onChange={(e) => setTargetMin(e.target.value)} />
          </label>

          <label>
            Target max (%)
            <input type="number" value={targetMax} onChange={(e) => setTargetMax(e.target.value)} />
          </label>

          <label>
            Normal water (L)
            <input type="number" value={normalWater} onChange={(e) => setNormalWater(e.target.value)} />
          </label>

          <label>
            Notes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
          </label>

          {formError && <p className="form-error">{formError}</p>}

          <div className="modal-actions">
            <button type="button" onClick={onCancel} disabled={submitting}>Cancel</button>
            <button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
