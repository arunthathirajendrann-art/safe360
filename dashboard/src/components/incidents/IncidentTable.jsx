import StatusBadge from "../common/StatusBadge";
import PriorityBadge from "../common/PriorityBadge";
import { formatIncidentId, formatTimeAgo, formatLocation } from "../../utils/formatters";
import { INCIDENT_TYPES } from "../../utils/constants";
import { Eye, MapPin, User, Siren, Activity, Mic } from "lucide-react";

export default function IncidentTable({ incidents, onSelectIncident }) {
  const getTypeIcon = (type) => {
    switch (type) {
      case "SOS":
        return <Siren size={15} style={{ color: "#EF4444" }} />;
      case "FALL":
        return <Activity size={15} style={{ color: "#F59E0B" }} />;
      case "VOICE":
        return <Mic size={15} style={{ color: "#3B82F6" }} />;
      default:
        return <Siren size={15} style={{ color: "#60A5FA" }} />;
    }
  };

  return (
    <div className="table-responsive">
      <table className="data-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Incident ID</th>
            <th>Priority</th>
            <th>Status</th>
            <th>User</th>
            <th>Assigned Responder</th>
            <th>Location</th>
            <th>Detected</th>
            <th style={{ textAlign: "right" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident) => {
            const id = incident._id || incident.id;
            const typeConfig = INCIDENT_TYPES[incident.type] || { label: incident.type };

            return (
              <tr key={id} onClick={() => onSelectIncident(incident)} style={{ cursor: "pointer" }}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "6px",
                        background: "rgba(255, 255, 255, 0.05)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      {getTypeIcon(incident.type)}
                    </div>
                    <span style={{ fontWeight: "600", color: "#FFFFFF" }}>{typeConfig.label || incident.type}</span>
                  </div>
                </td>

                <td>
                  <span className="mono" style={{ fontSize: "0.8rem", fontWeight: "600", color: "#60A5FA" }}>
                    {formatIncidentId(id)}
                  </span>
                </td>

                <td>
                  <PriorityBadge priority={incident.priority} />
                </td>

                <td>
                  <StatusBadge status={incident.status} />
                </td>

                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                    <User size={13} />
                    <span className="mono">{incident.userId || "USR-UNKNOWN"}</span>
                  </div>
                </td>

                <td>
                  {incident.currentResponder ? (
                    <span className="mono" style={{ fontSize: "0.775rem", color: "#818CF8", fontWeight: "600" }}>
                      {incident.currentResponder}
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)", italic: "true" }}>
                      Unassigned
                    </span>
                  )}
                </td>

                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--text-muted)", fontSize: "0.775rem" }}>
                    <MapPin size={13} style={{ color: "#EC4899", flexShrink: 0 }} />
                    <span className="mono">{formatLocation(incident.location)}</span>
                  </div>
                </td>

                <td>
                  <span style={{ fontSize: "0.775rem", color: "var(--text-subtle)" }}>
                    {formatTimeAgo(incident.createdAt)}
                  </span>
                </td>

                <td style={{ textAlign: "right" }}>
                  <button
                    className="btn btn-secondary btn-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectIncident(incident);
                    }}
                  >
                    <Eye size={13} /> View
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
