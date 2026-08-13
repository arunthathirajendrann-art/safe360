import AnalyticsCharts from "../components/analytics/AnalyticsCharts";
import { BarChart2 } from "lucide-react";

export default function AnalyticsPage({ incidents = [], responders = [], isDemo = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "rgba(139, 92, 246, 0.15)",
              color: "#A78BFA",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <BarChart2 size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.1rem", color: "#FFFFFF" }}>Telemetry Analytics & Insights</h2>
            <p style={{ fontSize: "0.775rem", color: "var(--text-muted)" }}>
              Data breakdown across incident types, lifecycle statuses, and severity levels
            </p>
          </div>
        </div>
      </div>

      <AnalyticsCharts incidents={incidents} responders={responders} isDemo={isDemo} />
    </div>
  );
}
