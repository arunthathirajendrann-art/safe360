import {
  fetchIncidentsApi,
  fetchIncidentByIdApi,
  fetchRespondersApi,
  updateIncidentStatusApi,
  respondToIncidentApi,
  createIncidentApi,
  checkBackendHealth
} from "./api";

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
    console.warn("Backend API unavailable:", error.message);
    isBackendConnected = false;
    return {
      success: true,
      incidents: [],
      isDemo: false,
      error: error.message,
      count: 0
    };
  }
}

export async function loadIncidentById(id) {
  try {
    const data = await fetchIncidentByIdApi(id);
    isBackendConnected = true;
    return { success: true, incident: data.incident, isDemo: false };
  } catch (error) {
    throw error;
  }
}

export async function loadResponders() {
  try {
    const data = await fetchRespondersApi();
    isBackendConnected = true;
    return {
      success: true,
      responders: data.responders || [],
      isDemo: false
    };
  } catch (error) {
    console.warn("Backend responders API error:", error.message);
    isBackendConnected = false;
    return {
      success: true,
      responders: [],
      isDemo: false
    };
  }
}

export async function updateIncidentStatus(id, status) {
  const data = await updateIncidentStatusApi(id, status);
  return { success: true, incident: data.incident, message: data.message, isDemo: false };
}

export async function respondToIncident(id, responderId) {
  const data = await respondToIncidentApi(id, responderId);
  return { success: true, incident: data.incident, message: data.message, isDemo: false };
}

export async function createIncident(incidentData) {
  const data = await createIncidentApi(incidentData);
  return { success: true, incident: data.incident, message: data.message, isDemo: false };
}

export async function pingBackendStatus() {
  const alive = await checkBackendHealth();
  isBackendConnected = alive;
  return alive;
}
