import { useState, useEffect, useCallback } from "react";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import OverviewPage from "./pages/OverviewPage";
import IncidentsPage from "./pages/IncidentsPage";
import RespondersPage from "./pages/RespondersPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import IncidentDetailsModal from "./components/incidents/IncidentDetailsModal";
import QuickIncidentModal from "./components/incidents/QuickIncidentModal";
import LoadingState from "./components/common/LoadingState";

import {
  loadIncidents,
  loadResponders,
  updateIncidentStatus,
  respondToIncident,
  createIncident,
  setDemoModeState,
  getDemoModeState
} from "./services/incidentService";

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [incidents, setIncidents] = useState([]);
  const [responders, setResponders] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(getDemoModeState());
  const [isBackendConnected, setIsBackendConnected] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [incRes, respRes] = await Promise.all([
        loadIncidents(),
        loadResponders()
      ]);

      setIncidents(incRes.incidents || []);
      setResponders(respRes.responders || []);
      setIsDemoMode(incRes.isDemo || false);
      setIsBackendConnected(!incRes.isDemo);
    } catch (err) {
      console.error("Telemetry fetch error:", err);
      setIsBackendConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const runFetch = async () => {
      if (isMounted) {
        await fetchData();
      }
    };
    runFetch();
    const interval = setInterval(runFetch, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchData]);

  const handleToggleDemo = () => {
    const nextState = !isDemoMode;
    setDemoModeState(nextState);
    setIsDemoMode(nextState);
    fetchData();
  };

  const handleUpdateStatus = async (id, newStatus) => {
    const res = await updateIncidentStatus(id, newStatus);
    fetchData();
    if (selectedIncident && (selectedIncident._id === id || selectedIncident.id === id)) {
      setSelectedIncident(res.incident);
    }
    return res;
  };

  const handleRespond = async (id, responderId) => {
    const res = await respondToIncident(id, responderId);
    fetchData();
    if (selectedIncident && (selectedIncident._id === id || selectedIncident.id === id)) {
      setSelectedIncident(res.incident);
    }
    return res;
  };

  const handleCreateIncident = async (incidentPayload) => {
    const res = await createIncident(incidentPayload);
    fetchData();
    return res;
  };

  const displayedIncidents = incidents.filter((i) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (i._id || "").toLowerCase().includes(q) ||
      (i.userId || "").toLowerCase().includes(q) ||
      (i.type || "").toLowerCase().includes(q) ||
      (i.context || "").toLowerCase().includes(q)
    );
  });

  const activeIncidentsCount = incidents.filter((i) => i.status !== "RESOLVED").length;

  const pageTitles = {
    overview: { title: "Safe360 Command Center", subtitle: "Live Emergency Telemetry & Operations" },
    incidents: { title: "Incidents Directory", subtitle: "Search, Filter & Transition Emergency Lifecycles" },
    responders: { title: "Tactical Responders", subtitle: "Emergency Fleet Availability & Proximity Matrix" },
    analytics: { title: "Telemetry Analytics", subtitle: "Operational Severity & Lifecycle Distributions" },
    settings: { title: "System Preferences", subtitle: "API Endpoints, Controls & Diagnostic Diagnostics" }
  };

  const currentTitleConfig = pageTitles[activeTab] || pageTitles.overview;

  return (
    <div className="app-shell">
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeIncidentsCount={activeIncidentsCount}
        isDemoMode={isDemoMode}
        onToggleDemo={handleToggleDemo}
      />

      {/* Main Container */}
      <div className="main-container">
        {/* Top Header */}
        <Header
          title={currentTitleConfig.title}
          subtitle={currentTitleConfig.subtitle}
          isDemoMode={isDemoMode}
          isBackendConnected={isBackendConnected}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onRefresh={fetchData}
          onOpenSimulator={() => setIsSimulatorOpen(true)}
        />

        {/* Main Content Area */}
        <main className="content-viewport">
          {loading ? (
            <LoadingState message="Connecting to Safe360 Telemetry Stream..." />
          ) : (
            <>
              {activeTab === "overview" && (
                <OverviewPage
                  incidents={displayedIncidents}
                  responders={responders}
                  onSelectIncident={(inc) => setSelectedIncident(inc)}
                  onOpenSimulator={() => setIsSimulatorOpen(true)}
                />
              )}

              {activeTab === "incidents" && (
                <IncidentsPage
                  incidents={displayedIncidents}
                  onSelectIncident={(inc) => setSelectedIncident(inc)}
                  onOpenSimulator={() => setIsSimulatorOpen(true)}
                />
              )}

              {activeTab === "responders" && (
                <RespondersPage responders={responders} />
              )}

              {activeTab === "analytics" && (
                <AnalyticsPage incidents={incidents} responders={responders} isDemo={isDemoMode} />
              )}

              {activeTab === "settings" && (
                <SettingsPage
                  isDemoMode={isDemoMode}
                  onToggleDemo={handleToggleDemo}
                  onCheckBackend={fetchData}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Incident Details Modal */}
      {selectedIncident && (
        <IncidentDetailsModal
          incident={selectedIncident}
          responders={responders}
          onClose={() => setSelectedIncident(null)}
          onUpdateStatus={handleUpdateStatus}
          onRespond={handleRespond}
        />
      )}

      {/* Quick Incident Simulator Modal */}
      {isSimulatorOpen && (
        <QuickIncidentModal
          onClose={() => setIsSimulatorOpen(false)}
          onCreateIncident={handleCreateIncident}
        />
      )}
    </div>
  );
}
