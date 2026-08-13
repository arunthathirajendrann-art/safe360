export default function StatsCard({ title, value, subtext, icon: Icon, color = "#3B82F6", pulse = false, onClick }) {
  return (
    <div
      className={`card ${onClick ? "card-interactive" : ""}`}
      onClick={onClick}
      style={{
        borderTop: `3px solid ${color}`,
        position: "relative",
        overflow: "hidden"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <span style={{ fontSize: "0.775rem", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {title}
        </span>
        <div
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "8px",
            background: `${color}18`,
            color: color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          {Icon && <Icon size={18} strokeWidth={2.2} />}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.25rem" }}>
        <span className="mono" style={{ fontSize: "1.9rem", fontWeight: "800", color: "#FFFFFF", lineHeight: 1 }}>
          {value}
        </span>
        {pulse && <span className="pulsing-dot" style={{ marginLeft: "4px" }}></span>}
      </div>

      {subtext && (
        <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
          {subtext}
        </div>
      )}
    </div>
  );
}
