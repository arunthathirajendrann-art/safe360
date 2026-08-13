import { AlertTriangle, RefreshCw, Database } from "lucide-react";

export default function ErrorState({ title = "Backend Connection Offline", message, onRetry, onSwitchDemo }) {
  return (
    <div
      className="card"
      style={{
        padding: "2rem",
        borderColor: "rgba(245, 158, 11, 0.4)",
        background: "rgba(245, 158, 11, 0.05)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "1rem",
        margin: "1rem 0"
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          background: "rgba(245, 158, 11, 0.15)",
          color: "#F59E0B",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <AlertTriangle size={26} />
      </div>

      <div>
        <h3 style={{ fontSize: "1.1rem", marginBottom: "0.4rem", color: "#FDE68A" }}>{title}</h3>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", maxWidth: "520px", lineHeight: "1.5" }}>
          {message || "The Safe360 backend service is currently unreachable on localhost:5000. Check backend status or switch to local Demo Mode to continue reviewing the command center dashboard."}
        </p>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
        {onRetry && (
          <button className="btn btn-secondary" onClick={onRetry}>
            <RefreshCw size={14} /> Retry API Call
          </button>
        )}
        {onSwitchDemo && (
          <button className="btn btn-primary" onClick={onSwitchDemo}>
            <Database size={14} /> Switch to Demo Mode
          </button>
        )}
      </div>
    </div>
  );
}
