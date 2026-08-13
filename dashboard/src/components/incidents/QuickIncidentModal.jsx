import { useState } from "react";
import { Siren, Activity, Mic, X, Send, AlertTriangle, Loader2 } from "lucide-react";

export default function QuickIncidentModal({ onClose, onCreateIncident }) {
  const [type, setType] = useState("SOS");
  const [userId, setUserId] = useState(() => `USR-${Math.floor(1000 + Math.random() * 9000)}`);
  const [latitude, setLatitude] = useState(37.7749);
  const [longitude, setLongitude] = useState(-122.4194);
  const [context, setContext] = useState("Emergency trigger generated from Safe360 Command Center Simulator.");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const payload = {
      type,
      userId,
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      },
      context,
      detectionEvidence: {
        simulated: true,
        critical: type === "SOS",
        triggerTime: new Date().toISOString(),
        heartRateBpm: type === "SOS" ? 145 : 88,
        cellularSignal: "STRONG_5G"
      }
    };

    try {
      await onCreateIncident(payload);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || "Failed to create incident");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: "560px" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Siren size={20} style={{ color: "#EF4444" }} />
            <h3 style={{ fontSize: "1.05rem", color: "#FFFFFF" }}>Simulate Emergency Incident</h3>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose} style={{ width: "32px", height: "32px", padding: 0 }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errorMessage && (
              <div
                style={{
                  padding: "0.75rem",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "#FCA5A5",
                  fontSize: "0.85rem",
                  marginBottom: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}
              >
                <AlertTriangle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Incident Type selector */}
            <div className="form-group">
              <label className="form-label">Incident Type (Backend Supported)</label>
              <div className="grid-3" style={{ gap: "0.5rem" }}>
                {[
                  { id: "SOS", label: "Panic SOS", icon: Siren, color: "#EF4444" },
                  { id: "FALL", label: "Fall Impact", icon: Activity, color: "#F59E0B" },
                  { id: "VOICE", label: "Voice Keyword", icon: Mic, color: "#3B82F6" }
                ].map((item) => {
                  const Icon = item.icon;
                  const selected = type === item.id;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setType(item.id)}
                      style={{
                        padding: "0.6rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid",
                        borderColor: selected ? item.color : "var(--border-color)",
                        background: selected ? `${item.color}20` : "var(--bg-input)",
                        color: selected ? item.color : "var(--text-muted)",
                        fontWeight: selected ? "700" : "500",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.35rem",
                        cursor: "pointer"
                      }}
                    >
                      <Icon size={18} />
                      <span style={{ fontSize: "0.75rem" }}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* User ID */}
            <div className="form-group">
              <label className="form-label">Subject User ID</label>
              <input
                type="text"
                className="input-field mono"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
              />
            </div>

            {/* Coordinates */}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Latitude</label>
                <input
                  type="number"
                  step="any"
                  className="input-field mono"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Longitude</label>
                <input
                  type="number"
                  step="any"
                  className="input-field mono"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Context narrative */}
            <div className="form-group">
              <label className="form-label">Trigger Context Narrative</label>
              <textarea
                className="textarea-field"
                rows={3}
                value={context}
                onChange={(e) => setContext(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-danger" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
              Transmit Incident Payload
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
