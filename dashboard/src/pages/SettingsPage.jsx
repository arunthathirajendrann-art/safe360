import { useState } from "react";
import { getApiBaseUrl, setApiBaseUrl, checkBackendHealth } from "../services/api";
import { Settings, Server, Radio, RefreshCw, CheckCircle2, AlertTriangle, Cpu } from "lucide-react";

export default function SettingsPage({ isDemoMode, onToggleDemo, onCheckBackend }) {
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [pingResult, setPingResult] = useState(null);

  const handleSaveUrl = (e) => {
    e.preventDefault();
    setApiBaseUrl(apiUrl);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleTestConnection = async () => {
    setIsChecking(true);
    setPingResult(null);
    const alive = await checkBackendHealth();
    await onCheckBackend();
    setPingResult(alive ? "CONNECTED" : "UNREACHABLE");
    setIsChecking(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "800px" }}>
      {/* Header */}
      <div className="card">
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
            <Settings size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.1rem", color: "#FFFFFF" }}>Command Center Settings</h2>
            <p style={{ fontSize: "0.775rem", color: "var(--text-muted)" }}>
              API endpoints, demo telemetry switches, and backend diagnostic configuration
            </p>
          </div>
        </div>
      </div>

      {/* Backend API Configuration */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <Server size={18} style={{ color: "#3B82F6" }} />
          <h3 style={{ fontSize: "0.95rem", color: "#FFFFFF" }}>Backend API Endpoint</h3>
        </div>

        <form onSubmit={handleSaveUrl}>
          <div className="form-group">
            <label className="form-label">API Base URL</label>
            <input
              type="text"
              className="input-field mono"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:5000/api"
              required
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)", marginTop: "4px" }}>
              Default backend URL is normally <code>http://localhost:5000/api</code>
            </span>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button type="submit" className="btn btn-primary btn-sm">
              Save Base URL
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleTestConnection}
              disabled={isChecking}
            >
              <RefreshCw size={14} className={isChecking ? "spin" : ""} />
              Test API Connection
            </button>

            {saveSuccess && (
              <span style={{ fontSize: "0.8rem", color: "#34D399", fontWeight: "600" }}>
                ✓ Settings saved
              </span>
            )}
          </div>

          {pingResult && (
            <div
              style={{
                marginTop: "1rem",
                padding: "0.75rem",
                borderRadius: "var(--radius-sm)",
                background: pingResult === "CONNECTED" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                border: `1px solid ${pingResult === "CONNECTED" ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
                color: pingResult === "CONNECTED" ? "#6EE7B7" : "#FCA5A5",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}
            >
              {pingResult === "CONNECTED" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>
                Backend Status: <strong>{pingResult}</strong> on {apiUrl}
              </span>
            </div>
          )}
        </form>
      </div>

      {/* Telemetry Stream Mode */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyBetween: "space-between", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Radio size={18} style={{ color: isDemoMode ? "#F59E0B" : "#10B981" }} />
            <h3 style={{ fontSize: "0.95rem", color: "#FFFFFF" }}>Telemetry Stream Source</h3>
          </div>

          <span
            className="badge"
            style={{
              background: isDemoMode ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)",
              color: isDemoMode ? "#FBBF24" : "#34D399"
            }}
          >
            {isDemoMode ? "DEMO MODE ACTIVE" : "LIVE API ACTIVE"}
          </span>
        </div>

        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: "1.5" }}>
          Toggle manual Demo Mode to test dashboard features independently of the backend Express server status. Demo Mode allows interactive status changes and incident simulation without altering real MongoDB data.
        </p>

        <button className="btn btn-secondary btn-sm" onClick={onToggleDemo}>
          Switch to {isDemoMode ? "Live Backend API" : "Offline Demo Mode"}
        </button>
      </div>

      {/* System Info */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem" }}>
          <Cpu size={18} style={{ color: "#8B5CF6" }} />
          <h3 style={{ fontSize: "0.95rem", color: "#FFFFFF" }}>System Diagnostic Specifications</h3>
        </div>

        <div className="mono" style={{ fontSize: "0.775rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <div>Dashboard Framework: React 19 + Vite 8</div>
          <div>API Endpoints: /api/incidents, /api/incidents/:id, /api/incidents/responders</div>
          <div>Lifecycle States: DETECTED → UNDERSTOOD → ASSESSED → ESCALATING → RESPONDER_ASSIGNED → HELP_EN_ROUTE → RESOLVED</div>
          <div>Incident Types Supported: SOS, FALL, VOICE</div>
          <div>Scope: safe360/dashboard (Frontend Only)</div>
        </div>
      </div>
    </div>
  );
}
