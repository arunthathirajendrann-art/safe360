import { useState } from "react";
import StatusBadge from "../common/StatusBadge";
import PriorityBadge from "../common/PriorityBadge";
import IncidentTimeline from "./IncidentTimeline";
import { formatIncidentId, formatDate, formatLocation } from "../../utils/formatters";
import { VALID_TRANSITIONS, STATUS_CONFIG } from "../../utils/constants";
import {
  X,
  MapPin,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Send,
  Code,
  ArrowRight,
  Loader2
} from "lucide-react";

export default function IncidentDetailsModal({
  incident,
  responders = [],
  onClose,
  onUpdateStatus,
  onRespond
}) {
  const [selectedResponder, setSelectedResponder] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  if (!incident) return null;

  const id = incident._id || incident.id;
  const currentStatus = incident.status;
  const allowedNextStatuses = VALID_TRANSITIONS[currentStatus] || [];

  const handleStatusTransition = async (nextStatus) => {
    setIsUpdating(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await onUpdateStatus(id, nextStatus);
      setActionSuccess(res.message || `Status updated to ${nextStatus}`);
    } catch (err) {
      setActionError(err.message || "Failed to update incident status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAssignResponderSubmit = async (e) => {
    e.preventDefault();
    if (!selectedResponder) return;
    setIsUpdating(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await onRespond(id, selectedResponder);
      setActionSuccess(res.message || `Responder ${selectedResponder} assigned successfully`);
    } catch (err) {
      setActionError(err.message || "Failed to assign responder");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "rgba(59, 130, 246, 0.15)",
                color: "#60A5FA",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Shield size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span className="mono" style={{ fontSize: "1.1rem", fontWeight: "800", color: "#FFFFFF" }}>
                  {formatIncidentId(id)}
                </span>
                <PriorityBadge priority={incident.priority} />
                <StatusBadge status={incident.status} />
              </div>
              <span style={{ fontSize: "0.775rem", color: "var(--text-muted)" }}>
                Type: <strong style={{ color: "#FFFFFF" }}>{incident.type}</strong> | Registered Subject: <span className="mono">{incident.userId}</span>
              </span>
            </div>
          </div>

          <button
            className="btn btn-outline btn-sm"
            onClick={onClose}
            style={{ width: "32px", height: "32px", padding: 0 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Action Feedback Alerts */}
          {actionError && (
            <div
              style={{
                padding: "0.75rem 1rem",
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
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span><strong>Backend Response:</strong> {actionError}</span>
            </div>
          )}

          {actionSuccess && (
            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-sm)",
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                color: "#6EE7B7",
                fontSize: "0.85rem",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}
            >
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Timeline */}
          <IncidentTimeline currentStatus={incident.status} />

          {/* Status Update Action Bar */}
          <div
            className="card"
            style={{
              background: "rgba(30, 41, 59, 0.5)",
              margin: "1rem 0",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.04em" }}>
                Lifecycle Action Controller
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>
                Current State: <strong style={{ color: "#60A5FA" }}>{currentStatus}</strong>
              </span>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
              {allowedNextStatuses.length > 0 ? (
                allowedNextStatuses.map((nextSt) => (
                  <button
                    key={nextSt}
                    className="btn btn-primary btn-sm"
                    disabled={isUpdating}
                    onClick={() => handleStatusTransition(nextSt)}
                    style={{ gap: "0.4rem" }}
                  >
                    {isUpdating ? <Loader2 size={14} className="spin" /> : <ArrowRight size={14} />}
                    Advance to {STATUS_CONFIG[nextSt]?.label || nextSt}
                  </button>
                ))
              ) : (
                <span style={{ fontSize: "0.8rem", color: "#34D399", fontWeight: "600" }}>
                  ✓ Lifecycle Complete (Incident Resolved)
                </span>
              )}
            </div>

            {/* Responder Assignment section if status is ESCALATING */}
            {currentStatus === "ESCALATING" && (
              <form
                onSubmit={handleAssignResponderSubmit}
                style={{
                  marginTop: "0.5rem",
                  paddingTop: "0.75rem",
                  borderTop: "1px solid var(--border-subtle)",
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "center"
                }}
              >
                <select
                  className="select-field"
                  value={selectedResponder}
                  onChange={(e) => setSelectedResponder(e.target.value)}
                  style={{ height: "36px", fontSize: "0.8rem", flex: 1 }}
                >
                  <option value="">Select Responder to Dispatch...</option>
                  {responders.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.id}) - {r.status} ({r.distanceKm || 1.2} km away)
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  className="btn btn-secondary btn-sm"
                  disabled={isUpdating || !selectedResponder}
                  style={{ height: "36px" }}
                >
                  <Send size={14} /> Dispatch Responder
                </button>
              </form>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid-2" style={{ marginBottom: "1rem" }}>
            {/* Left Info Card */}
            <div className="card">
              <h4 style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.75rem" }}>
                Telemetry Metadata
              </h4>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.85rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-subtle)" }}>Subject ID:</span>
                  <span className="mono" style={{ fontWeight: "600", color: "#FFFFFF" }}>{incident.userId}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-subtle)" }}>Assigned Responder:</span>
                  <span className="mono" style={{ fontWeight: "600", color: incident.currentResponder ? "#818CF8" : "var(--text-subtle)" }}>
                    {incident.currentResponder || "None"}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-subtle)" }}>Created Timestamp:</span>
                  <span className="mono" style={{ fontSize: "0.775rem", color: "#FFFFFF" }}>{formatDate(incident.createdAt)}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-subtle)" }}>Last Updated:</span>
                  <span className="mono" style={{ fontSize: "0.775rem", color: "#FFFFFF" }}>{formatDate(incident.updatedAt)}</span>
                </div>
              </div>
            </div>

            {/* Right Location & Map Card */}
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <h4 style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Geolocation Coordinates
                </h4>
                <MapPin size={16} style={{ color: "#EC4899" }} />
              </div>

              <div style={{ fontSize: "0.9rem", fontWeight: "600", color: "#FFFFFF", marginBottom: "0.5rem" }} className="mono">
                {formatLocation(incident.location)}
              </div>

              {incident.location && incident.location.latitude && (
                <div
                  style={{
                    background: "rgba(14, 20, 32, 0.8)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    padding: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem"
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "rgba(236, 72, 153, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#F472B6"
                    }}
                  >
                    <MapPin size={18} />
                  </div>
                  <div style={{ fontSize: "0.75rem" }}>
                    <div style={{ color: "#FFFFFF", fontWeight: "600" }}>GPS Lock Verified</div>
                    <div style={{ color: "var(--text-subtle)" }} className="mono">
                      Lat: {incident.location.latitude} | Lng: {incident.location.longitude}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Adaptive Escalation Audit Log */}
          {Array.isArray(incident.escalationHistory) && incident.escalationHistory.length > 0 && (
            <div className="card" style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
                <h4 style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Adaptive Escalation Audit History
                </h4>
                <span style={{ fontSize: "0.75rem", color: "#818CF8", fontWeight: "600" }}>
                  Current Tier: {incident.escalationState?.currentTier || "PRIMARY"} ({incident.escalationState?.status || "CONTACTING"})
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {incident.escalationHistory.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "rgba(15, 23, 42, 0.6)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      padding: "0.6rem 0.8rem",
                      fontSize: "0.8rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.2rem"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: "700", color: "#F3F4F6" }}>
                        [{item.tier}] {item.contactName || "Contact"} ({item.action})
                      </span>
                      <span className="mono" style={{ fontSize: "0.7rem", color: "var(--text-subtle)" }}>
                        {formatDate(item.timestamp)}
                      </span>
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.775rem" }}>
                      Reason: <span style={{ color: "#93C5FD" }}>{item.reason}</span>
                    </div>
                    {(item.callSid || item.provider || item.callStatus) && (
                      <div style={{ display: "flex", gap: "0.8rem", fontSize: "0.725rem", color: "#A5B4FC", marginTop: "0.1rem" }} className="mono">
                        {item.provider && <span>Provider: {item.provider}</span>}
                        {item.callSid && <span>Call SID: {item.callSid}</span>}
                        {item.callStatus && <span>Status: {item.callStatus}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detection Evidence Payload */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
              <Code size={15} style={{ color: "#60A5FA" }} />
              <h4 style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Detection Evidence Payload
              </h4>
            </div>

            <pre
              className="mono"
              style={{
                background: "rgba(8, 12, 20, 0.9)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "0.85rem",
                fontSize: "0.775rem",
                color: "#60A5FA",
                overflowX: "auto",
                whiteSpace: "pre-wrap"
              }}
            >
              {JSON.stringify(incident.detectionEvidence || {}, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
