function assessIncident(incident) {
  const { type, detectionEvidence = {}, context = "" } = incident;

  // Critical conditions
  if (
    type === "SOS" ||
    detectionEvidence.critical === true
  ) {
    return "CRITICAL";
  }

  // High-risk conditions
  if (
    type === "FALL" ||
    detectionEvidence.injury === true ||
    detectionEvidence.unresponsive === true
  ) {
    return "HIGH";
  }

  // Medium-risk conditions
  if (
    type === "VOICE" ||
    context.toLowerCase().includes("help")
  ) {
    return "MEDIUM";
  }

  return "LOW";
}

module.exports = {
  assessIncident
};