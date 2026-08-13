import { ShieldCheck } from "lucide-react";

export default function EmptyState({ title = "No Incidents Recorded", description = "All emergency telemetry monitoring parameters normal.", icon: CustomIcon, action }) {
  const Icon = CustomIcon || ShieldCheck;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3.5rem 1.5rem",
        textAlign: "center",
        gap: "1rem",
        color: "var(--text-muted)",
        border: "1px dashed var(--border-color)",
        borderRadius: "var(--radius-md)",
        background: "rgba(19, 27, 46, 0.4)"
      }}
    >
      <div
        style={{
          width: "52px",
          height: "52px",
          borderRadius: "12px",
          background: "rgba(59, 130, 246, 0.1)",
          color: "#3B82F6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Icon size={26} strokeWidth={1.8} />
      </div>

      <div>
        <h4 style={{ fontSize: "1rem", color: "#FFFFFF", marginBottom: "0.35rem" }}>{title}</h4>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: "420px" }}>{description}</p>
      </div>

      {action && <div style={{ marginTop: "0.5rem" }}>{action}</div>}
    </div>
  );
}
