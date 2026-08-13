import { INCIDENT_STATUSES, STATUS_CONFIG } from "../../utils/constants";
import { Check, Radio } from "lucide-react";

export default function IncidentTimeline({ currentStatus }) {
  const currentIndex = INCIDENT_STATUSES.indexOf(currentStatus);

  return (
    <div style={{ width: "100%", padding: "1rem 0" }}>
      <div style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "1rem" }}>
        Incident Lifecycle Telemetry Timeline
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
        {/* Connector Line Background */}
        <div
          style={{
            position: "absolute",
            top: "16px",
            left: "20px",
            right: "20px",
            height: "3px",
            background: "var(--border-color)",
            zIndex: 1
          }}
        />

        {/* Active Line Progress */}
        <div
          style={{
            position: "absolute",
            top: "16px",
            left: "20px",
            width: `${Math.max(0, (currentIndex / (INCIDENT_STATUSES.length - 1)) * 100)}%`,
            height: "3px",
            background: "linear-gradient(90deg, #3B82F6 0%, #10B981 100%)",
            zIndex: 1,
            transition: "width 0.3s ease"
          }}
        />

        {INCIDENT_STATUSES.map((status, index) => {
          const config = STATUS_CONFIG[status] || { label: status, color: "#3B82F6" };
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div
              key={status}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                zIndex: 2,
                position: "relative",
                flex: 1
              }}
            >
              {/* Step Circle */}
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isCompleted
                    ? "#10B981"
                    : isCurrent
                    ? "var(--bg-modal)"
                    : "var(--bg-sidebar)",
                  border: isCompleted
                    ? "2px solid #10B981"
                    : isCurrent
                    ? `2px solid ${config.color || "#3B82F6"}`
                    : "2px solid var(--border-color)",
                  color: isCompleted
                    ? "#FFFFFF"
                    : isCurrent
                    ? config.color || "#3B82F6"
                    : "var(--text-subtle)",
                  boxShadow: isCurrent ? `0 0 14px ${config.color || "#3B82F6"}80` : "none",
                  transition: "all 0.2s ease"
                }}
              >
                {isCompleted ? (
                  <Check size={16} strokeWidth={3} />
                ) : isCurrent ? (
                  <Radio size={16} className="spin" style={{ animation: "pulse-red 1.5s infinite" }} />
                ) : (
                  <span style={{ fontSize: "0.725rem", fontWeight: "700" }}>{index + 1}</span>
                )}
              </div>

              {/* Label */}
              <span
                style={{
                  fontSize: "0.675rem",
                  fontWeight: isCurrent ? "700" : "500",
                  color: isCurrent ? "#FFFFFF" : isCompleted ? "#34D399" : "var(--text-subtle)",
                  marginTop: "0.5rem",
                  textAlign: "center",
                  maxWidth: "90px",
                  lineHeight: "1.2"
                }}
              >
                {config.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
