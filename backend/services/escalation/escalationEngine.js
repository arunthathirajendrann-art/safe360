// Responder Fleet State (Development / Demo Provider Source)
const RESPONDERS_FLEET = [
  {
    id: "RESP-001",
    name: "Tactical Unit Alpha",
    status: "AVAILABLE",
    distanceKm: 1.2,
    role: "First Responder Lead"
  },
  {
    id: "RESP-002",
    name: "Paramedic Unit Bravo",
    status: "AVAILABLE",
    distanceKm: 2.4,
    role: "Emergency Medical Specialist"
  },
  {
    id: "RESP-003",
    name: "Rapid Patrol Delta",
    status: "BUSY",
    distanceKm: 0.8,
    role: "Mobile Security Patrol"
  }
];

function getResponders() {
  return RESPONDERS_FLEET.map((r) => ({ ...r, isDevelopmentSource: true }));
}

function findAvailableResponder() {
  const available = RESPONDERS_FLEET
    .filter((r) => r.status === "AVAILABLE")
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return available[0] ? { ...available[0] } : null;
}

function assignResponder(responderId) {
  const target = RESPONDERS_FLEET.find((r) => r.id === responderId);
  if (!target) {
    return { success: false, message: `Responder ${responderId} not found` };
  }
  if (target.status !== "AVAILABLE") {
    return { success: false, message: `Responder ${responderId} is currently BUSY` };
  }

  target.status = "BUSY";
  return { success: true, responder: { ...target } };
}

function releaseResponder(responderId) {
  const target = RESPONDERS_FLEET.find((r) => r.id === responderId);
  if (target) {
    target.status = "AVAILABLE";
    return { success: true, responder: { ...target } };
  }
  return { success: false, message: `Responder ${responderId} not found` };
}

function escalateIncident(incident) {
  const responder = findAvailableResponder();

  if (!responder) {
    return {
      success: false,
      message: "No available responders in proximity fleet",
      responder: null
    };
  }

  const assignResult = assignResponder(responder.id);
  if (!assignResult.success) {
    return assignResult;
  }

  return {
    success: true,
    message: `Responder ${responder.id} (${responder.name}) assigned`,
    responder: assignResult.responder
  };
}

module.exports = {
  MOCK_RESPONDERS: RESPONDERS_FLEET,
  getResponders,
  findAvailableResponder,
  assignResponder,
  releaseResponder,
  escalateIncident
};