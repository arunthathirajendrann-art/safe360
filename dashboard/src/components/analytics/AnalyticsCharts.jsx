import { STATUS_CONFIG, PRIORITY_CONFIG, INCIDENT_TYPES } from "../../utils/constants";
import { BarChart3, Activity, ShieldAlert } from "lucide-react";

export default function AnalyticsCharts({ incidents = [], isDemo = false }) {
  const statusCounts = {};
  const priorityCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  const typeCounts = { SOS: 0, FALL: 0, VOICE: 0 };

  incidents.forEach((i) => {
    if (i.status) statusCounts[i.status] = (statusCounts[i.status] || 0) + 1;
    if (i.priority) priorityCounts[i.priority] = (priorityCounts[i.priority] || 0) + 1;
    if (i.type) typeCounts[i.type] = (typeCounts[i.type] || 0) + 1;
  });

  const totalIncidents = incidents.length || 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Source banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.75rem 1rem",
          background: "rgba(30, 41, 59, 0.4)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-sm)"
        }}
      >
        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          Telemetry Analytics Engine: Analyzing <strong style={{ color: "#FFFFFF" }}>{incidents.length} Recorded Incidents</strong>
        </span>
        <span
          className="badge"
          style={{
            background: isDemo ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)",
            color: isDemo ? "#FBBF24" : "#34D399"
          }}
        >
          {isDemo ? "DEMO TELEMETRY STREAM" : "LIVE BACKEND AGGREGATION"}
        </span>
      </div>

      <div className="grid-2">
        {/* Incident Type Distribution Bar Chart */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <BarChart3 size={18} style={{ color: "#3B82F6" }} />
            <h3 style={{ fontSize: "0.95rem", color: "#FFFFFF" }}>Incident Type Breakdown</h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {Object.keys(INCIDENT_TYPES).map((typeKey) => {
              const count = typeCounts[typeKey] || 0;
              const percent = Math.round((count / totalIncidents) * 100);
              const config = INCIDENT_TYPES[typeKey];

              return (
                <div key={typeKey}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.35rem" }}>
                    <span style={{ fontWeight: "600", color: "#FFFFFF" }}>{config.label} ({typeKey})</span>
                    <span className="mono" style={{ color: "var(--text-muted)" }}>{count} ({percent}%)</span>
                  </div>

                  <div style={{ height: "8px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "4px", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${percent}%`,
                        background: config.color,
                        borderRadius: "4px",
                        transition: "width 0.5s ease"
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Severity Distribution */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <ShieldAlert size={18} style={{ color: "#EF4444" }} />
            <h3 style={{ fontSize: "0.95rem", color: "#FFFFFF" }}>Priority & Severity Spectrum</h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {Object.keys(PRIORITY_CONFIG).map((prioKey) => {
              const count = priorityCounts[prioKey] || 0;
              const percent = Math.round((count / totalIncidents) * 100);
              const config = PRIORITY_CONFIG[prioKey];

              return (
                <div key={prioKey}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.35rem" }}>
                    <span style={{ fontWeight: "600", color: config.color }}>{config.label} Severity</span>
                    <span className="mono" style={{ color: "var(--text-muted)" }}>{count} ({percent}%)</span>
                  </div>

                  <div style={{ height: "8px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "4px", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${percent}%`,
                        background: config.color,
                        borderRadius: "4px",
                        transition: "width 0.5s ease"
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lifecycle Status Distribution Grid */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
          <Activity size={18} style={{ color: "#10B981" }} />
          <h3 style={{ fontSize: "0.95rem", color: "#FFFFFF" }}>Lifecycle State Density Matrix</h3>
        </div>

        <div className="grid-4" style={{ gap: "1rem" }}>
          {Object.keys(STATUS_CONFIG).map((stKey) => {
            const count = statusCounts[stKey] || 0;
            const config = STATUS_CONFIG[stKey];

            return (
              <div
                key={stKey}
                style={{
                  background: "rgba(8, 12, 20, 0.6)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "0.85rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem"
                }}
              >
                <div style={{ fontSize: "0.725rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600" }}>
                  {config.label}
                </div>
                <div className="mono" style={{ fontSize: "1.5rem", fontWeight: "800", color: config.color || "#FFFFFF" }}>
                  {count}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
