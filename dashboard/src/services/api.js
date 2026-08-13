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

export async function fetchIncidentsApi() {
  const url = `${getApiBaseUrl()}/incidents`;
  const res = await fetch(url, {
    headers: { "Accept": "application/json" }
  });
  return handleResponse(res);
}

export async function fetchIncidentByIdApi(id) {
  const url = `${getApiBaseUrl()}/incidents/${id}`;
  const res = await fetch(url, {
    headers: { "Accept": "application/json" }
  });
  return handleResponse(res);
}

export async function fetchRespondersApi() {
  const url = `${getApiBaseUrl()}/incidents/responders`;
  const res = await fetch(url, {
    headers: { "Accept": "application/json" }
  });
  return handleResponse(res);
}

export async function updateIncidentStatusApi(id, status) {
  const url = `${getApiBaseUrl()}/incidents/${id}/status`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({ status })
  });
  return handleResponse(res);
}

export async function respondToIncidentApi(id, responderId) {
  const url = `${getApiBaseUrl()}/incidents/${id}/respond`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({ responderId })
  });
  return handleResponse(res);
}

export async function createIncidentApi(incidentData) {
  const url = `${getApiBaseUrl()}/incidents`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(incidentData)
  });
  return handleResponse(res);
}

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${getApiBaseUrl()}/incidents`, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });
    return res.ok;
  } catch {
    return false;
  }
}
