import { Loader2, Radio } from "lucide-react";

export default function LoadingState({ message = "Scanning Telemetry Stream..." }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "4rem 2rem",
        gap: "1.25rem",
        color: "var(--text-muted)"
      }}
    >
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={44} className="spin" style={{ color: "#3B82F6", animation: "spin 1.2s linear infinite" }} />
        <Radio size={20} style={{ position: "absolute", color: "#60A5FA" }} />
      </div>
      <span style={{ fontSize: "0.9rem", fontWeight: "500", letterSpacing: "0.02em" }}>{message}</span>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
