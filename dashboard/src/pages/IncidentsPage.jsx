import { useState } from "react";
import IncidentTable from "../components/incidents/IncidentTable";
import EmptyState from "../components/common/EmptyState";
import { INCIDENT_STATUSES, PRIORITY_CONFIG, INCIDENT_TYPES } from "../utils/constants";
import { Search, PlusCircle, Siren } from "lucide-react";

export default function IncidentsPage({
  incidents = [],
  onSelectIncident,
  onOpenSimulator
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const filteredIncidents = incidents.filter((i) => {
    const idMatches = (i._id || i.id || "").toLowerCase().includes(search.toLowerCase());
    const userMatches = (i.userId || "").toLowerCase().includes(search.toLowerCase());
    const contextMatches = (i.context || "").toLowerCase().includes(search.toLowerCase());
    const queryMatch = idMatches || userMatches || contextMatches;

    const statusMatch = statusFilter === "ALL" || i.status === statusFilter;
    const priorityMatch = priorityFilter === "ALL" || i.priority === priorityFilter;
    const typeMatch = typeFilter === "ALL" || i.type === typeFilter;

    return queryMatch && statusMatch && priorityMatch && typeMatch;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header Controls Card */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", color: "#FFFFFF" }}>Incidents Directory</h2>
            <p style={{ fontSize: "0.775rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Search, inspect and transition emergency lifecycle states
            </p>
          </div>

          <button className="btn btn-danger btn-sm" onClick={onOpenSimulator}>
            <PlusCircle size={14} /> Simulate Incident
          </button>
        </div>

        {/* Filters Grid */}
        <div className="grid-4" style={{ gap: "0.75rem" }}>
          {/* Search Query */}
          <div style={{ position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-subtle)" }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search ID, User, Context..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: "32px", height: "36px", fontSize: "0.8rem" }}
            />
          </div>

          {/* Status Dropdown */}
          <select
            className="select-field"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ height: "36px", fontSize: "0.8rem" }}
          >
            <option value="ALL">All Statuses ({incidents.length})</option>
            {INCIDENT_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {/* Priority Dropdown */}
          <select
            className="select-field"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ height: "36px", fontSize: "0.8rem" }}
          >
            <option value="ALL">All Priorities</option>
            {Object.keys(PRIORITY_CONFIG).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Type Dropdown */}
          <select
            className="select-field"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ height: "36px", fontSize: "0.8rem" }}
          >
            <option value="ALL">All Incident Types</option>
            {Object.keys(INCIDENT_TYPES).map((t) => (
              <option key={t} value={t}>
                {INCIDENT_TYPES[t].label} ({t})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Directory Table */}
      {filteredIncidents.length > 0 ? (
        <IncidentTable incidents={filteredIncidents} onSelectIncident={onSelectIncident} />
      ) : (
        <EmptyState
          title="No Matching Incidents"
          description="Try broadening your search query or status filter parameters."
          icon={Siren}
        />
      )}
    </div>
  );
}
