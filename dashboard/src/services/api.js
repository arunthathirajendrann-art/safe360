import { DEFAULT_API_BASE } from "../utils/constants";

let currentApiBase = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE;

export function getApiBaseUrl() {
  return currentApiBase;
}

export function setApiBaseUrl(url) {
  if (url) {
    currentApiBase = url.replace(/\/$/, "");
  }
}

export function getAuthToken() {
  return localStorage.getItem("safe360_token") || "";
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem("safe360_token", token);
  } else {
    localStorage.removeItem("safe360_token");
  }
}

function getHeaders(customHeaders = {}) {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...customHeaders
  };
}

async function handleResponse(response) {
  const contentType = response.headers.get("content-type");
  let data;
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = { message: text || response.statusText };
  }

  if (!response.ok) {
    const errorMsg = data.message || data.error || `HTTP ${response.status} Error`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// --- AUTHENTICATION ---
export async function loginGuardianApi(email, password) {
  const url = `${getApiBaseUrl()}/auth/login`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await handleResponse(res);
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function fetchMeApi() {
  const url = `${getApiBaseUrl()}/auth/me`;
  const res = await fetch(url, {
    headers: getHeaders()
  });
  return handleResponse(res);
}

// --- GUARDIAN CONNECTION CODE ---
export async function connectWithCodeApi(code) {
  const url = `${getApiBaseUrl()}/contacts/connect-code`;
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ code })
  });
  return handleResponse(res);
}

// --- GUARDIAN SCOPED DATA ---
export async function fetchConnectedPeopleApi() {
  const url = `${getApiBaseUrl()}/contacts/guardians/people`;
  const res = await fetch(url, {
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function fetchConnectedIncidentsApi() {
  const url = `${getApiBaseUrl()}/contacts/guardians/incidents`;
  const res = await fetch(url, {
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function acknowledgeIncidentApi(incidentId) {
  const url = `${getApiBaseUrl()}/incidents/${incidentId}/acknowledge`;
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders()
  });
  return handleResponse(res);
}

// --- GENERAL INCIDENTS & RESPONDERS ---
export async function fetchIncidentsApi() {
  const url = `${getApiBaseUrl()}/incidents`;
  const res = await fetch(url, {
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function fetchIncidentByIdApi(id) {
  const url = `${getApiBaseUrl()}/incidents/${id}`;
  const res = await fetch(url, {
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function fetchRespondersApi() {
  const url = `${getApiBaseUrl()}/incidents/responders`;
  const res = await fetch(url, {
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function updateIncidentStatusApi(id, status) {
  const url = `${getApiBaseUrl()}/incidents/${id}/status`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({ status })
  });
  return handleResponse(res);
}

export async function respondToIncidentApi(id, responderId) {
  const url = `${getApiBaseUrl()}/incidents/${id}/respond`;
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ responderId })
  });
  return handleResponse(res);
}

export async function createIncidentApi(incidentData) {
  const url = `${getApiBaseUrl()}/incidents`;
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(incidentData)
  });
  return handleResponse(res);
}

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${getApiBaseUrl()}/health`, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });
    return res.ok;
  } catch {
    return false;
  }
}
