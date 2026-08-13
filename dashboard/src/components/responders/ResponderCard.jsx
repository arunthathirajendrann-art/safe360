import { UserCheck, Navigation, PhoneCall, Radio, CheckCircle } from "lucide-react";

export default function ResponderCard({ responder, onAssign }) {
  const isAvailable = responder.status === "AVAILABLE";

  return (
    <div
      className="card"
      style={{
        borderLeft: `4px solid ${isAvailable ? "#10B981" : "#F59E0B"}`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "1rem"
      }}
    >
      {/* Top Details */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: isAvailable ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                color: isAvailable ? "#10B981" : "#F59E0B",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <UserCheck size={18} />
            </div>
            <div>
              <h4 style={{ fontSize: "0.95rem", color: "#FFFFFF", lineHeight: "1.2" }}>
                {responder.name || `Responder ${responder.id}`}
              </h4>
              <span className="mono" style={{ fontSize: "0.75rem", color: "#60A5FA" }}>
                {responder.id}
              </span>
            </div>
          </div>

          <span
            className="badge"
            style={{
              background: isAvailable ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
              color: isAvailable ? "#34D399" : "#FBBF24",
              borderColor: isAvailable ? "rgba(16, 185, 129, 0.35)" : "rgba(245, 158, 11, 0.35)"
            }}
          >
            {isAvailable ? <CheckCircle size={12} /> : <Radio size={12} />}
            {responder.status}
          </span>
        </div>

        {/* Role & Unit badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <span
            style={{
              fontSize: "0.725rem",
              padding: "0.25rem 0.5rem",
              borderRadius: "4px",
              background: "rgba(255, 255, 255, 0.05)",
              color: "var(--text-muted)"
            }}
          >
            {responder.role || "Tactical First Responder"}
          </span>
          <span
            style={{
              fontSize: "0.725rem",
              padding: "0.25rem 0.5rem",
              borderRadius: "4px",
              background: "rgba(99, 102, 241, 0.15)",
              color: "#818CF8",
              fontWeight: "600"
            }}
          >
            {responder.badge || "Unit Alpha"}
          </span>
        </div>
      </div>

      {/* Footer Proximity & Actions */}
      <div
        style={{
          borderTop: "1px solid var(--border-subtle)",
          paddingTop: "0.75rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          <Navigation size={14} style={{ color: "#3B82F6" }} />
          <span className="mono" style={{ fontWeight: "600", color: "#FFFFFF" }}>
            {responder.distanceKm !== undefined ? `${responder.distanceKm} km` : "1.2 km"}
          </span>
          <span>proximity</span>
        </div>

        {onAssign && (
          <button
            className="btn btn-secondary btn-xs"
            disabled={!isAvailable}
            onClick={() => onAssign(responder.id)}
          >
            <PhoneCall size={12} /> Dispatch Unit
          </button>
        )}
      </div>
    </div>
  );
}
