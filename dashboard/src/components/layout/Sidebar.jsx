import {
  Shield,
  LayoutDashboard,
  Siren,
  Users,
  BarChart3,
  Settings,
  Radio,
  ToggleLeft,
  ToggleRight,
  UserCheck
} from "lucide-react";

export default function Sidebar({ activeTab, setActiveTab, activeIncidentsCount, isDemoMode, onToggleDemo }) {
  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "incidents", label: "Incidents", icon: Siren, badge: activeIncidentsCount },
    { id: "responders", label: "Responders", icon: Users },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings }
  ];

  return (
    <aside
      style={{
        width: "260px",
        height: "100vh",
        background: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        flexShrink: 0,
        zIndex: 20
      }}
    >
      {/* Brand Header */}
      <div>
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem"
          }}
        >
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 16px rgba(239, 68, 68, 0.4)",
              color: "#FFFFFF"
            }}
          >
            <Shield size={22} strokeWidth={2.4} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "1.1rem", fontWeight: "800", letterSpacing: "0.04em", color: "#FFFFFF" }}>
                SAFE360
              </span>
              <span
                style={{
                  fontSize: "0.6rem",
                  fontWeight: "700",
                  padding: "0.15rem 0.35rem",
                  borderRadius: "4px",
                  background: "rgba(59, 130, 246, 0.2)",
                  color: "#60A5FA",
                  border: "1px solid rgba(59, 130, 246, 0.3)"
                }}
              >
                PRO
              </span>
            </div>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Command Center
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav style={{ padding: "1rem 0.85rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "0.7rem 0.9rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid",
                  borderColor: isActive ? "rgba(59, 130, 246, 0.3)" : "transparent",
                  background: isActive ? "linear-gradient(90deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.03) 100%)" : "transparent",
                  color: isActive ? "#60A5FA" : "var(--text-muted)",
                  fontWeight: isActive ? "600" : "500",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  transition: "all 0.15s ease-in-out"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <Icon size={18} strokeWidth={isActive ? 2.3 : 1.8} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className="mono"
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: "700",
                      padding: "0.15rem 0.5rem",
                      borderRadius: "999px",
                      background: "rgba(239, 68, 68, 0.2)",
                      color: "#EF4444",
                      border: "1px solid rgba(239, 68, 68, 0.4)"
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Controls & Status */}
      <div style={{ padding: "1rem", borderTop: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        {/* Mode Switcher Toggle */}
        <div
          onClick={onToggleDemo}
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            padding: "0.6rem 0.75rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer"
          }}
          title="Toggle between Live API and Offline Demo Mode"
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Radio size={14} style={{ color: isDemoMode ? "#F59E0B" : "#10B981" }} />
            <span style={{ fontSize: "0.75rem", fontWeight: "600", color: isDemoMode ? "#FDE68A" : "#6EE7B7" }}>
              {isDemoMode ? "Demo Mode" : "Live API"}
            </span>
          </div>
          {isDemoMode ? <ToggleRight size={20} style={{ color: "#F59E0B" }} /> : <ToggleLeft size={20} style={{ color: "#10B981" }} />}
        </div>

        {/* User Profile */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", paddingTop: "0.25rem" }}>
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              background: "#1E293B",
              border: "1px solid #334155",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94A3B8"
            }}
          >
            <UserCheck size={18} />
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: "600", color: "#FFFFFF", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
              Dispatcher 01
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-subtle)" }}>
              Admin Operations
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
