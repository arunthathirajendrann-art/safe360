import StatusBadge from "../common/StatusBadge";
import PriorityBadge from "../common/PriorityBadge";
import { formatIncidentId, formatTimeAgo, formatLocation } from "../../utils/formatters";
import { INCIDENT_TYPES } from "../../utils/constants";
import { MapPin, User, Siren, Activity, Mic, Clock, ChevronRight } from "lucide-react";

export default function IncidentCardGrid({ incidents, onSelectIncident }) {
  const getTypeIcon = (type) => {
    switch (type) {
      case "SOS":
        return <Siren size={18} style={{ color: "#EF4444" }} />;
      case "FALL":
        return <Activity size={18} style={{ color: "#F59E0B" }} />;
      case "VOICE":
        return <Mic size={18} style={{ color: "#3B82F6" }} />;
      default:
        return <Siren size={18} style={{ color: "#60A5FA" }} />;
    }
  };

  return (
    <div className="grid-3">
      {incidents.map((incident) => {
        const id = incident._id || incident.id;
        const typeConfig = INCIDENT_TYPES[incident.type] || { label: incident.type };

        return (
          <div
            key={id}
            className="card card-interactive"
            onClick={() => onSelectIncident(incident)}
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "1rem"
            }}
          >
            {/* Card Top Header */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    {getTypeIcon(incident.type)}
                  </div>
                  <div>
                    <h4 style={{ fontSize: "0.95rem", color: "#FFFFFF", lineHeight: 1.2 }}>
                      {typeConfig.label || incident.type}
                    </h4>
                    <span className="mono" style={{ fontSize: "0.725rem", color: "#60A5FA" }}>
                      {formatIncidentId(id)}
                    </span>
                  </div>
                </div>

                <PriorityBadge priority={incident.priority} />
              </div>

              {/* Status Badge */}
              <div style={{ marginBottom: "0.85rem" }}>
                <StatusBadge status={incident.status} />
              </div>

              {/* Context Summary */}
              {incident.context && (
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    lineHeight: "1.4",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    marginBottom: "0.85rem"
                  }}
                >
                  {incident.context}
                </p>
              )}
            </div>

            {/* Card Footer Details */}
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-subtle)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <User size={12} /> <span className="mono">{incident.userId}</span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <Clock size={12} /> {formatTimeAgo(incident.createdAt)}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "0.35rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.725rem", color: "var(--text-muted)" }}>
                  <MapPin size={12} style={{ color: "#EC4899" }} />
                  <span className="mono">{formatLocation(incident.location)}</span>
                </div>

                <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#3B82F6", display: "flex", alignItems: "center" }}>
                  Inspect <ChevronRight size={14} />
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
