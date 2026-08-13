import ResponderCard from "../components/responders/ResponderCard";
import StatsCard from "../components/common/StatsCard";
import EmptyState from "../components/common/EmptyState";
import { Users, UserCheck, Radio, ShieldCheck } from "lucide-react";

export default function RespondersPage({ responders = [] }) {
  const availableResponders = responders.filter((r) => r.status === "AVAILABLE");
  const busyResponders = responders.filter((r) => r.status === "BUSY");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Metrics Row */}
      <div className="grid-3">
        <StatsCard
          title="Total Responders"
          value={responders.length}
          subtext="Demo Responder Fleet"
          icon={Users}
          color="#3B82F6"
        />
        <StatsCard
          title="Available for Dispatch"
          value={availableResponders.length}
          subtext="Standby readiness"
          icon={UserCheck}
          color="#10B981"
        />
        <StatsCard
          title="Currently Busy"
          value={busyResponders.length}
          subtext="Active emergency dispatch"
          icon={Radio}
          color="#F59E0B"
        />
      </div>

      {/* Main Grid Card */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", color: "#FFFFFF" }}>Tactical Responder Fleet</h2>
            <p style={{ fontSize: "0.775rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Backend Demo Responders directory and status matrix
            </p>
          </div>

          <span
            className="badge"
            style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60A5FA", borderColor: "rgba(59, 130, 246, 0.35)" }}
          >
            <ShieldCheck size={12} /> GET /api/incidents/responders
          </span>
        </div>

        {responders.length > 0 ? (
          <div className="grid-3">
            {responders.map((responder) => (
              <ResponderCard key={responder.id} responder={responder} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No Responders Registered"
            description="No demo responders currently returned by backend API."
            icon={Users}
          />
        )}
      </div>
    </div>
  );
}
