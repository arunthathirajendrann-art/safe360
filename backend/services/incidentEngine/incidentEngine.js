const VALID_TRANSITIONS = {
  DETECTED: ["UNDERSTOOD"],
  UNDERSTOOD: ["ASSESSED"],
  ASSESSED: ["ESCALATING"],
  ESCALATING: ["RESPONDER_ASSIGNED"],
  RESPONDER_ASSIGNED: ["HELP_EN_ROUTE"],
  HELP_EN_ROUTE: ["RESOLVED"],
  RESOLVED: []
};

function canTransition(currentStatus, nextStatus) {
  const allowedStatuses = VALID_TRANSITIONS[currentStatus];

  if (!allowedStatuses) {
    return false;
  }

  return allowedStatuses.includes(nextStatus);
}

function getNextStatuses(currentStatus) {
  return VALID_TRANSITIONS[currentStatus] || [];
}

module.exports = {
  VALID_TRANSITIONS,
  canTransition,
  getNextStatuses
};