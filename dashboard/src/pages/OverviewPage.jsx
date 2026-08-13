import { useState } from "react";
import StatsCard from "../components/common/StatsCard";
import IncidentTable from "../components/incidents/IncidentTable";
import IncidentCardGrid from "../components/incidents/IncidentCardGrid";
import EmptyState from "../components/common/EmptyState";
import { Siren, AlertTriangle, UserCheck, CheckCircle2, LayoutGrid, List, PlusCircle } from "lucide-react";

export default function OverviewPage({
  incidents = [],
  responders = [],
  onSelectIncident,
  onOpenSimulator
}) {
  const [viewMode, setViewMode] = useState("table");
  const [filterType, setFilterType] = useState("ALL");

  const activeIncidents = incidents.filter((i) => i.status !== "RESOLVED");
  const highPriorityIncidents = incidents.filter(
    (i) => i.status !== "RESOLVED" && (i.priority === "HIGH" || i.priority === "CRITICAL")
  );
  const availableResponders = responders.filter((r) => r.status === "AVAILABLE");
  const resolvedIncidents = incidents.filter((i) => i.status === "RESOLVED");

  const filteredIncidents = incidents.filter((i) => {
    if (filterType === "ALL") return true;
    if (filterType === "HIGH_CRITICAL") return i.priority === "HIGH" || i.priority === "CRITICAL";
    return i.type === filterType;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* 4 Stats Cards */}
      <div className="grid-4">
        <StatsCard
          title="Active Incidents"
          value={activeIncidents.length}
          subtext="Monitoring live telemetry stream"
          icon={Siren}
          color="#EF4444"
          pulse={activeIncidents.length > 0}
        />
        <StatsCard
          title="High Priority"
          value={highPriorityIncidents.length}
          subtext="Requires immediate dispatch"
          icon={AlertTriangle}
          color="#F59E0B"
        />
        <StatsCard
          title="Available Responders"
          value={`${availableResponders.length}/${responders.length}`}
          subtext="Tactical units on standby"
          icon={UserCheck}
          color="#10B981"
        />
        <StatsCard
          title="Resolved Incidents"
          value={resolvedIncidents.length}
          subtext="Successfully closed"
          icon={CheckCircle2}
          color="#3B82F6"
        />
      </div>

      {/* Main Active Incidents Control Section */}
      <div className="card" style={{ padding: "1.25rem" }}>
        {/* Toolbar Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", color: "#FFFFFF" }}>Emergency Incident Stream</h2>
            <p style={{ fontSize: "0.775rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Showing {filteredIncidents.length} incident payload records
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            {/* Quick Filter Buttons */}
            <div style={{ display: "flex", background: "var(--bg-dark)", borderRadius: "var(--radius-sm)", padding: "2px", border: "1px solid var(--border-subtle)" }}>
              {[
                { id: "ALL", label: "All" },
                { id: "HIGH_CRITICAL", label: "Critical/High" },
                { id: "SOS", label: "SOS" },
                { id: "FALL", label: "Fall" },
                { id: "VOICE", label: "Voice" }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id)}
                  style={{
                    padding: "0.3rem 0.65rem",
                    borderRadius: "4px",
                    border: "none",
                    background: filterType === f.id ? "var(--bg-card-hover)" : "transparent",
                    color: filterType === f.id ? "#FFFFFF" : "var(--text-muted)",
                    fontSize: "0.75rem",
                    fontWeight: filterType === f.id ? "600" : "500",
                    cursor: "pointer"
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* View Mode Toggle (Table / Grid) */}
            <div style={{ display: "flex", background: "var(--bg-dark)", borderRadius: "var(--radius-sm)", padding: "2px", border: "1px solid var(--border-subtle)" }}>
              <button
                onClick={() => setViewMode("table")}
                style={{
                  padding: "0.3rem 0.5rem",
                  borderRadius: "4px",
                  border: "none",
                  background: viewMode === "table" ? "#3B82F6" : "transparent",
                  color: viewMode === "table" ? "#FFFFFF" : "var(--text-muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center"
                }}
                title="Table Density View"
              >
                <List size={15} />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                style={{
                  padding: "0.3rem 0.5rem",
                  borderRadius: "4px",
                  border: "none",
                  background: viewMode === "grid" ? "#3B82F6" : "transparent",
                  color: viewMode === "grid" ? "#FFFFFF" : "var(--text-muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center"
                }}
                title="Cards Grid View"
              >
                <LayoutGrid size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Content View */}
        {filteredIncidents.length > 0 ? (
          viewMode === "table" ? (
            <IncidentTable incidents={filteredIncidents} onSelectIncident={onSelectIncident} />
          ) : (
            <IncidentCardGrid incidents={filteredIncidents} onSelectIncident={onSelectIncident} />
          )
        ) : (
          <EmptyState
            title="No Incidents Found"
            description="No emergency incidents currently match the selected filter criteria."
            action={
              <button className="btn btn-danger btn-sm" onClick={onOpenSimulator}>
                <PlusCircle size={14} /> Simulate Test Incident
              </button>
            }
          />
        )}
      </div>
    </div>
  );
}
