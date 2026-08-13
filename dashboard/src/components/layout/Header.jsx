import { useState, useEffect } from "react";
import {
  Clock,
  Search,
  RefreshCw,
  PlusCircle
} from "lucide-react";

export default function Header({
  title,
  subtitle,
  isDemoMode,
  isBackendConnected,
  searchQuery,
  setSearchQuery,
  onRefresh,
  onOpenSimulator
}) {
  const [time, setTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const formattedTime = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });

  return (
    <header
      style={{
        height: "70px",
        background: "var(--bg-sidebar)",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 2rem",
        flexShrink: 0,
        zIndex: 10
      }}
    >
      {/* Title Area */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#FFFFFF", lineHeight: 1.1 }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: "0.775rem", color: "var(--text-muted)", marginTop: "2px" }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Global Operational Status */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.3rem 0.7rem",
            borderRadius: "999px",
            background: isDemoMode
              ? "rgba(245, 158, 11, 0.12)"
              : isBackendConnected
              ? "rgba(16, 185, 129, 0.12)"
              : "rgba(239, 68, 68, 0.12)",
            border: `1px solid ${
              isDemoMode
                ? "rgba(245, 158, 11, 0.3)"
                : isBackendConnected
                ? "rgba(16, 185, 129, 0.3)"
                : "rgba(239, 68, 68, 0.3)"
            }`
          }}
        >
          {isDemoMode ? (
            <>
              <span className="demo-dot"></span>
              <span style={{ fontSize: "0.725rem", fontWeight: "700", color: "#FDE68A", letterSpacing: "0.04em" }}>
                DEMO TELEMETRY ACTIVE
              </span>
            </>
          ) : isBackendConnected ? (
            <>
              <span className="operational-dot"></span>
              <span style={{ fontSize: "0.725rem", fontWeight: "700", color: "#6EE7B7", letterSpacing: "0.04em" }}>
                SYSTEM OPERATIONAL
              </span>
            </>
          ) : (
            <>
              <span className="pulsing-dot"></span>
              <span style={{ fontSize: "0.725rem", fontWeight: "700", color: "#FCA5A5", letterSpacing: "0.04em" }}>
                BACKEND UNREACHABLE
              </span>
            </>
          )}
        </div>
      </div>

      {/* Action Controls & Clock */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {/* Search Bar */}
        <div style={{ position: "relative", width: "240px" }}>
          <Search
            size={15}
            style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-subtle)" }}
          />
          <input
            type="text"
            className="input-field"
            placeholder="Search incidents or users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: "32px", height: "36px", fontSize: "0.8rem" }}
          />
        </div>

        {/* Live Clock */}
        <div
          className="mono"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.825rem",
            fontWeight: "600",
            color: "#60A5FA",
            background: "rgba(30, 41, 59, 0.6)",
            padding: "0.4rem 0.75rem",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-subtle)"
          }}
        >
          <Clock size={14} />
          <span>{formattedTime}</span>
        </div>

        {/* Refresh button */}
        <button
          className="btn btn-outline btn-sm"
          onClick={handleRefreshClick}
          title="Refresh telemetry feed"
          style={{ height: "36px", width: "36px", padding: 0 }}
        >
          <RefreshCw size={15} className={isRefreshing ? "spin" : ""} />
        </button>

        {/* Simulate Incident Action Trigger */}
        <button
          className="btn btn-danger btn-sm"
          onClick={onOpenSimulator}
          style={{ height: "36px", gap: "0.4rem" }}
        >
          <PlusCircle size={15} />
          <span>Simulate Incident</span>
        </button>
      </div>
    </header>
  );
}
