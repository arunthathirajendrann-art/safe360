import {
  fetchIncidentsApi,
  fetchIncidentByIdApi,
  fetchRespondersApi,
  updateIncidentStatusApi,
  respondToIncidentApi,
  createIncidentApi,
  checkBackendHealth
} from "./api";

import { MOCK_INCIDENTS, MOCK_RESPONDERS } from "./mockData";

let demoIncidents = [...MOCK_INCIDENTS];
let demoResponders = [...MOCK_RESPONDERS];
let isDemoMode = false;
let isBackendConnected = true;

export function setDemoModeState(enabled) {
  isDemoMode = enabled;
}

export function getDemoModeState() {
  return isDemoMode;
}

export function getBackendConnectedState() {
  return isBackendConnected;
}

export async function loadIncidents() {
  if (isDemoMode) {
    return {
      success: true,
      incidents: [...demoIncidents],
      isDemo: true,
      count: demoIncidents.length
    };
  }

  try {
    const data = await fetchIncidentsApi();
    isBackendConnected = true;
    return {
      success: true,
      incidents: data.incidents || [],
      isDemo: false,
      count: data.count || (data.incidents ? data.incidents.length : 0)
    };
  } catch (error) {
    console.warn("Backend API unavailable, switching to Demo Data:", error.message);
    isBackendConnected = false;
    return {
      success: true,
      incidents: [...demoIncidents],
      isDemo: true,
      error: error.message,
      count: demoIncidents.length
    };
  }
}

export async function loadIncidentById(id) {
  if (isDemoMode) {
    const found = demoIncidents.find((i) => i._id === id || i.id === id);
    if (!found) throw new Error("Incident not found in demo data");
    return { success: true, incident: found, isDemo: true };
  }

  try {
    const data = await fetchIncidentByIdApi(id);
    isBackendConnected = true;
    return { success: true, incident: data.incident, isDemo: false };
  } catch (error) {
    if (!isBackendConnected || error.message.includes("Failed to fetch")) {
      const found = demoIncidents.find((i) => i._id === id || i.id === id);
      if (found) return { success: true, incident: found, isDemo: true };
    }
    throw error;
  }
}

export async function loadResponders() {
  if (isDemoMode) {
    return {
      success: true,
      responders: [...demoResponders],
      isDemo: true
    };
  }

  try {
    const data = await fetchRespondersApi();
    isBackendConnected = true;
    return {
      success: true,
      responders: data.responders || [],
      isDemo: false
    };
  } catch (error) {
    console.warn("Backend responders API error, using demo responders:", error.message);
    isBackendConnected = false;
    return {
      success: true,
      responders: [...demoResponders],
      isDemo: true
    };
  }
}

export async function updateIncidentStatus(id, status) {
  if (isDemoMode || !isBackendConnected) {
    const index = demoIncidents.findIndex((i) => i._id === id);
    if (index !== -1) {
      demoIncidents[index] = {
        ...demoIncidents[index],
        status,
        updatedAt: new Date().toISOString()
      };
      if (status === "ESCALATING" && !demoIncidents[index].currentResponder) {
        demoIncidents[index].currentResponder = "RESP-001";
      }
      return {
        success: true,
        message: "Status updated in Demo Mode",
        incident: demoIncidents[index],
        isDemo: true
      };
    }
  }

  const data = await updateIncidentStatusApi(id, status);
  return { success: true, incident: data.incident, message: data.message, isDemo: false };
}

export async function respondToIncident(id, responderId) {
  if (isDemoMode || !isBackendConnected) {
    const index = demoIncidents.findIndex((i) => i._id === id);
    if (index !== -1) {
      demoIncidents[index] = {
        ...demoIncidents[index],
        status: "RESPONDER_ASSIGNED",
        currentResponder: responderId,
        updatedAt: new Date().toISOString()
      };
      return {
        success: true,
        message: "Responder assigned in Demo Mode",
        incident: demoIncidents[index],
        isDemo: true
      };
    }
  }

  const data = await respondToIncidentApi(id, responderId);
  return { success: true, incident: data.incident, message: data.message, isDemo: false };
}

export async function createIncident(incidentData) {
  if (isDemoMode || !isBackendConnected) {
    const newId = `66b1a2f9c40001001e00` + String(Math.floor(100000 + Math.random() * 900000));
    const newIncident = {
      _id: newId,
      type: incidentData.type || "SOS",
      userId: incidentData.userId || `USR-${Math.floor(1000 + Math.random() * 9000)}`,
      status: "DETECTED",
      priority: incidentData.type === "SOS" ? "CRITICAL" : incidentData.type === "FALL" ? "HIGH" : "MEDIUM",
      location: incidentData.location || { latitude: 37.7749, longitude: -122.4194 },
      context: incidentData.context || "Demo simulated trigger from Safe360 Command Center",
      detectionEvidence: incidentData.detectionEvidence || { simulated: true, triggerTime: new Date().toISOString() },
      currentResponder: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    demoIncidents.unshift(newIncident);
    return {
      success: true,
      message: "Incident simulated successfully (Demo Mode)",
      incident: newIncident,
      isDemo: true
    };
  }

  const data = await createIncidentApi(incidentData);
  return { success: true, incident: data.incident, message: data.message, isDemo: false };
}

export async function pingBackendStatus() {
  const alive = await checkBackendHealth();
  isBackendConnected = alive;
  return alive;
}
