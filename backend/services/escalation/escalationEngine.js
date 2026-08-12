const MOCK_RESPONDERS = [
  {
    id: "RESP-001",
    name: "Demo Responder 1",
    status: "AVAILABLE",
    distanceKm: 1.2
  },
  {
    id: "RESP-002",
    name: "Demo Responder 2",
    status: "AVAILABLE",
    distanceKm: 2.4
  },
  {
    id: "RESP-003",
    name: "Demo Responder 3",
    status: "BUSY",
    distanceKm: 0.8
  }
];

function findAvailableResponder() {
  const availableResponders = MOCK_RESPONDERS
    .filter((responder) => responder.status === "AVAILABLE")
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return availableResponders[0] || null;
}

function escalateIncident(incident) {
  const responder = findAvailableResponder();

  if (!responder) {
    return {
      success: false,
      message: "No responders available",
      responder: null
    };
  }

  return {
    success: true,
    message: "Demo responder assigned",
    responder
  };
}

module.exports = {
  MOCK_RESPONDERS,
  findAvailableResponder,
  escalateIncident
};