import { useState, useEffect, useCallback } from "react";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import OverviewPage from "./pages/OverviewPage";
import IncidentsPage from "./pages/IncidentsPage";
import RespondersPage from "./pages/RespondersPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import LoginView from "./components/auth/LoginView";
import IncidentDetailsModal from "./components/incidents/IncidentDetailsModal";
import QuickIncidentModal from "./components/incidents/QuickIncidentModal";
import LoadingState from "./components/common/LoadingState";

import {
  getAuthToken,
  setAuthToken,
  fetchMeApi,
  fetchConnectedPeopleApi,
  fetchConnectedIncidentsApi,
  acknowledgeIncidentApi
} from "./services/api";

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
  const [authToken, setAuthTokenState] = useState(getAuthToken());
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [connectedPeople, setConnectedPeople] = useState([]);
  const [guardianIncidents, setGuardianIncidents] = useState([]);
  const [responders, setResponders] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(getDemoModeState());
  const [isBackendConnected, setIsBackendConnected] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Authenticate & load current guardian user profile
  useEffect(() => {
    async function verifyAuth() {
      if (authToken) {
        try {
          const userRes = await fetchMeApi();
          if (userRes.success && userRes.user) {
            setCurrentUser(userRes.user);
          } else {
            setAuthToken("");
            setAuthTokenState("");
            setCurrentUser(null);
          }
        } catch (err) {
          console.warn("Session verification failed, logging out:", err.message);
          setAuthToken("");
          setAuthTokenState("");
          setCurrentUser(null);
        }
      }
      setLoading(false);
    }
    verifyAuth();
  }, [authToken]);

  // Main data fetch loop
  const fetchData = useCallback(async () => {
    if (!authToken) return;

    try {
      const [peopleRes, incRes, respRes] = await Promise.all([
        fetchConnectedPeopleApi().catch(() => ({ connectedPeople: [] })),
        fetchConnectedIncidentsApi().catch(() => ({ incidents: [] })),
        loadResponders().catch(() => ({ responders: [] }))
      ]);

      setConnectedPeople(peopleRes.connectedPeople || []);
      setGuardianIncidents(incRes.incidents || []);
      setResponders(respRes.responders || []);
      setIsBackendConnected(true);
    } catch (err) {
      console.error("Guardian telemetry fetch error:", err);
      setIsBackendConnected(false);
    }
  }, [authToken]);

  // Real-time SSE stream listener + 3-second fallback polling
  useEffect(() => {
    if (!authToken) return;

    let isMounted = true;
    const runFetch = async () => {
      if (isMounted) {
        await fetchData();
      }
    };
    runFetch();
    const interval = setInterval(runFetch, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchData, authToken]);

  const handleLoginSuccess = (user, token) => {
    setAuthToken(token);
    setAuthTokenState(token);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setAuthToken("");
    setAuthTokenState("");
    setCurrentUser(null);
    setConnectedPeople([]);
    setGuardianIncidents([]);
  };

  const handleAcknowledge = async (incidentId) => {
    try {
      const res = await acknowledgeIncidentApi(incidentId);
      await fetchData();
      if (selectedIncident && (selectedIncident._id === incidentId || selectedIncident.id === incidentId)) {
        setSelectedIncident(res.incident || selectedIncident);
      }
      return res;
    } catch (err) {
      alert("Failed to acknowledge emergency: " + err.message);
    }
  };

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

  // Filtered incidents for search query
  const displayedIncidents = guardianIncidents.filter((i) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (i._id || "").toLowerCase().includes(q) ||
      (i.userId || "").toLowerCase().includes(q) ||
      (i.type || "").toLowerCase().includes(q) ||
      (i.source || "").toLowerCase().includes(q) ||
      (i.context || "").toLowerCase().includes(q)
    );
  });

  const activeIncidentsCount = guardianIncidents.filter((i) => i.status !== "RESOLVED" && i.status !== "ACKNOWLEDGED").length;

  // Unauthenticated Guardian View
  if (!authToken || !currentUser) {
    if (loading) {
      return <LoadingState message="Verifying Guardian Credentials..." />;
    }
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const pageTitles = {
    overview: { title: "Guardian Command Center", subtitle: `Authenticated Guardian: ${currentUser.name} (${currentUser.email})` },
    incidents: { title: "Protected Emergency Logs", subtitle: "Historical Incident Directory & Audit Trail" },
    responders: { title: "Tactical Responders", subtitle: "Emergency Fleet Availability & Proximity Matrix" },
    analytics: { title: "Telemetry Analytics", subtitle: "Operational Severity & Lifecycle Distributions" },
    settings: { title: "System Preferences", subtitle: "API Endpoints, Controls & Diagnostics" }
  };

  const currentTitleConfig = pageTitles[activeTab] || pageTitles.overview;

  return (
    <div className="app-shell">
      {/* Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeIncidentsCount={activeIncidentsCount}
        isDemoMode={isDemoMode}
        onToggleDemo={handleToggleDemo}
      />

      {/* Main Container */}
      <div className="main-container">
        {/* Top Header with User Info & Logout */}
        <Header
          title={currentTitleConfig.title}
          subtitle={currentTitleConfig.subtitle}
          isDemoMode={isDemoMode}
          isBackendConnected={isBackendConnected}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onRefresh={fetchData}
          onOpenSimulator={() => setIsSimulatorOpen(true)}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Main Content Area */}
        <main className="content-viewport">
          {activeTab === "overview" && (
            <OverviewPage
              currentUser={currentUser}
              connectedPeople={connectedPeople}
              incidents={displayedIncidents}
              responders={responders}
              onAcknowledge={handleAcknowledge}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
              onOpenSimulator={() => setIsSimulatorOpen(true)}
              onRefresh={fetchData}
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
            <AnalyticsPage incidents={guardianIncidents} responders={responders} isDemo={isDemoMode} />
          )}

          {activeTab === "settings" && (
            <SettingsPage
              isDemoMode={isDemoMode}
              onToggleDemo={handleToggleDemo}
              onCheckBackend={fetchData}
            />
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
          onAcknowledge={handleAcknowledge}
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
