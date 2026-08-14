const { evaluateSafetyRisk } = require("./riskEngine");

function assessIncident(incident) {
  const result = evaluateSafetyRisk(incident);
  return result.priority || "HIGH";
}

module.exports = {
  assessIncident,
  evaluateSafetyRisk
};