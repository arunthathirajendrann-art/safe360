const VALID_TRANSITIONS = {
  DETECTED: ["UNDERSTOOD"],
  UNDERSTOOD: ["ASSESSED"],
  ASSESSED: ["ESCALATING", "ACKNOWLEDGED"],
  ESCALATING: ["ACKNOWLEDGED", "RESPONDER_ASSIGNED"],
  ACKNOWLEDGED: ["RESPONDER_ASSIGNED", "RESOLVED"],
  RESPONDER_ASSIGNED: ["HELP_EN_ROUTE", "RESOLVED"],
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