const Incident = require("../../models/Incident");
const { escalateIncident } = require("./escalationEngine");
const { sendNotification } = require("../notification/notificationEngine");

function getDefaultPolicy() {
  const timeoutSec = parseInt(process.env.ESCALATION_TIMEOUT_SECONDS || "15", 10);

  return {
    primaryContact: {
      id: "CNT-PRIMARY-01",
      name: process.env.PRIMARY_CONTACT_NAME || "Parent / Primary Guardian",
      phone: process.env.PRIMARY_CONTACT_PHONE || "+1-555-0191",
      channel: "DEVELOPMENT_CONSOLE_PROVIDER"
    },
    secondaryContact: {
      id: "CNT-SECONDARY-02",
      name: process.env.SECONDARY_CONTACT_NAME || "Sibling / Emergency Contact 2",
      phone: process.env.SECONDARY_CONTACT_PHONE || "+1-555-0192",
      channel: "DEVELOPMENT_CONSOLE_PROVIDER"
    },
    tertiaryContact: {
      id: "CNT-TERTIARY-03",
      name: process.env.TERTIARY_CONTACT_NAME || "Neighbor / Local Guardian 3",
      phone: process.env.TERTIARY_CONTACT_PHONE || "+1-555-0193",
      channel: "DEVELOPMENT_CONSOLE_PROVIDER"
    },
    responseTimeoutSeconds: timeoutSec
  };
}

/**
 * Helper to construct escalation history entry from notification result.
 */
function buildHistoryEntry(tier, contact, defaultAction, defaultReason, notifResult) {
  const isVoice = notifResult && notifResult.provider === "TWILIO_VOICE_PROVIDER";
  let action = defaultAction;
  let reason = defaultReason;

  if (notifResult && notifResult.success === false) {
    action = isVoice ? "CALL_FAILED" : "CONTACT_FAILED";
    reason = `Notification failed via ${notifResult.provider}: ${notifResult.error || "Delivery error"}`;
  } else if (isVoice) {
    action = "CALL_ATTEMPTED";
    reason = `${defaultReason} (Twilio Voice Call SID: ${notifResult.callSid || "N/A"})`;
  }

  return {
    tier,
    contactName: contact ? contact.name : "N/A",
    contactPhone: contact ? contact.phone : "N/A",
    action,
    reason,
    timestamp: new Date()
  };
}

/**
 * Initializes escalation for an incident based on priority policy.
 * LOW: Stays PENDING (routine monitoring).
 * MEDIUM/HIGH/CRITICAL: Contacts PRIMARY tier with calculated timeout.
 */
async function initializeEscalation(incident, llmAssessment = {}) {
  const policy = incident.escalationPolicy && incident.escalationPolicy.primaryContact
    ? incident.escalationPolicy
    : getDefaultPolicy();

  incident.escalationPolicy = policy;

  const priority = incident.priority || llmAssessment.priority || "HIGH";
  const now = new Date();
  const timeoutSec = policy.responseTimeoutSeconds || 15;
  const timeoutAt = new Date(now.getTime() + timeoutSec * 1000);

  if (priority === "LOW") {
    incident.escalationState = {
      currentTier: "NONE",
      status: "PENDING",
      currentContact: null,
      contactedAt: null,
      acknowledgedAt: null,
      timeoutAt: null,
      responseStatus: "MONITORING_ONLY",
      escalationReason: "LOW priority incident logged for routine monitoring."
    };

    incident.escalationHistory.push({
      tier: "NONE",
      contactName: "N/A",
      contactPhone: "N/A",
      action: "INITIATED",
      reason: "LOW priority incident logged for routine monitoring.",
      timestamp: now
    });

    return incident;
  }

  // MEDIUM, HIGH, or CRITICAL: Start at PRIMARY tier
  const primary = policy.primaryContact;
  const initReason = `${priority} priority incident initiated primary contact escalation for ${primary.name}`;

  incident.escalationState = {
    currentTier: "PRIMARY",
    status: "CONTACTING",
    currentContact: primary,
    contactedAt: now,
    acknowledgedAt: null,
    timeoutAt: timeoutAt,
    responseStatus: "AWAITING_ACKNOWLEDGEMENT",
    escalationReason: initReason
  };

  // Emit notification/voice call to Primary Contact
  const notifResult = await sendNotification({
    incident,
    recipient: primary,
    escalationTier: "PRIMARY",
    reason: initReason
  });

  const historyEntry = buildHistoryEntry("PRIMARY", primary, "CONTACT_ATTEMPTED", initReason, notifResult);
  incident.escalationHistory.push(historyEntry);

  return incident;
}

/**
 * Advances escalation to the next tier deterministically.
 */
async function advanceEscalation(incident, reason) {
  const policy = incident.escalationPolicy || getDefaultPolicy();
  const currentTier = incident.escalationState ? incident.escalationState.currentTier : "NONE";
  const now = new Date();
  const timeoutSec = policy.responseTimeoutSeconds || 15;
  const timeoutAt = new Date(now.getTime() + timeoutSec * 1000);

  if (currentTier === "PRIMARY") {
    // Advance to SECONDARY
    const secondary = policy.secondaryContact;
    const advanceReason = reason || `Primary contact did not respond within ${timeoutSec}s; advancing to secondary contact.`;

    incident.escalationState = {
      currentTier: "SECONDARY",
      status: "CONTACTING",
      currentContact: secondary,
      contactedAt: now,
      acknowledgedAt: null,
      timeoutAt: timeoutAt,
      responseStatus: "AWAITING_ACKNOWLEDGEMENT",
      escalationReason: advanceReason
    };

    const notifResult = await sendNotification({
      incident,
      recipient: secondary,
      escalationTier: "SECONDARY",
      reason: advanceReason
    });

    const historyEntry = buildHistoryEntry("SECONDARY", secondary, "ESCALATED_NEXT_TIER", advanceReason, notifResult);
    incident.escalationHistory.push(historyEntry);

  } else if (currentTier === "SECONDARY") {
    // Advance to TERTIARY
    const tertiary = policy.tertiaryContact;
    const advanceReason = reason || `Secondary contact did not respond within ${timeoutSec}s; advancing to tertiary contact.`;

    incident.escalationState = {
      currentTier: "TERTIARY",
      status: "CONTACTING",
      currentContact: tertiary,
      contactedAt: now,
      acknowledgedAt: null,
      timeoutAt: timeoutAt,
      responseStatus: "AWAITING_ACKNOWLEDGEMENT",
      escalationReason: advanceReason
    };

    const notifResult = await sendNotification({
      incident,
      recipient: tertiary,
      escalationTier: "TERTIARY",
      reason: advanceReason
    });

    const historyEntry = buildHistoryEntry("TERTIARY", tertiary, "ESCALATED_NEXT_TIER", advanceReason, notifResult);
    incident.escalationHistory.push(historyEntry);

  } else if (currentTier === "TERTIARY" || currentTier === "PRIMARY" || currentTier === "SECONDARY") {
    // Advance to RESPONDER_FLEET
    const dispatchReason = reason || `All configured personal contacts failed to respond within timeout; escalating to emergency responder fleet.`;

    const escalationResult = escalateIncident(incident);

    let responderName = "Tactical Fleet Unit";
    let responderId = null;

    if (escalationResult.success && escalationResult.responder) {
      responderName = escalationResult.responder.name;
      responderId = escalationResult.responder.id;
      incident.currentResponder = responderId;
    }

    incident.status = "RESPONDER_ASSIGNED";
    incident.escalationState = {
      currentTier: "RESPONDER_FLEET",
      status: "ESCALATED",
      currentContact: {
        id: responderId || "RESP-FLEET",
        name: responderName,
        phone: process.env.EMERGENCY_CONTACT_PHONE || "+1-555-9110",
        channel: "TACTICAL_DISPATCH"
      },
      contactedAt: now,
      acknowledgedAt: null,
      timeoutAt: null,
      responseStatus: "DISPATCHED",
      escalationReason: dispatchReason
    };

    incident.escalationHistory.push({
      tier: "RESPONDER_FLEET",
      contactName: responderName,
      contactPhone: process.env.EMERGENCY_CONTACT_PHONE || "+1-555-9110",
      action: "DISPATCHED_RESPONDER",
      reason: dispatchReason,
      timestamp: now
    });

    await sendNotification({
      incident,
      responder: escalationResult.responder || { name: responderName, id: responderId },
      escalationTier: "RESPONDER_FLEET",
      reason: dispatchReason
    });
  }

  await incident.save();
  return incident;
}

/**
 * Acknowledges escalation for a contact, stopping further escalation.
 */
async function acknowledgeEscalation(incidentId, tier, contactId) {
  const incident = await Incident.findById(incidentId);
  if (!incident) {
    throw new Error(`Incident ${incidentId} not found`);
  }

  const now = new Date();
  const ackTier = tier || (incident.escalationState ? incident.escalationState.currentTier : "PRIMARY");
  const contactName = incident.escalationState && incident.escalationState.currentContact
    ? incident.escalationState.currentContact.name
    : "Configured Contact";

  const ackReason = `Contact ${contactName} acknowledged incident escalation at ${ackTier} tier. Escalation sequence halted.`;

  incident.escalationState = {
    ...incident.escalationState,
    status: "ACKNOWLEDGED",
    acknowledgedAt: now,
    responseStatus: "ACKNOWLEDGED",
    escalationReason: ackReason
  };

  incident.escalationHistory.push({
    tier: ackTier,
    contactName,
    contactPhone: incident.escalationState.currentContact ? incident.escalationState.currentContact.phone : "N/A",
    action: "ACKNOWLEDGED",
    reason: ackReason,
    timestamp: now
  });

  await incident.save();
  return incident;
}

/**
 * Worker poller function that checks for timed-out contacts in MongoDB and advances them.
 */
async function processEscalationTimeouts() {
  try {
    const now = new Date();
    const timedOutIncidents = await Incident.find({
      "escalationState.status": "CONTACTING",
      "escalationState.timeoutAt": { $lte: now }
    });

    for (const incident of timedOutIncidents) {
      const tier = incident.escalationState ? incident.escalationState.currentTier : "PRIMARY";
      const contactName = incident.escalationState && incident.escalationState.currentContact
        ? incident.escalationState.currentContact.name
        : "Contact";
      const timeoutSec = incident.escalationPolicy ? incident.escalationPolicy.responseTimeoutSeconds : 15;

      const timeoutReason = `${tier} contact (${contactName}) did not acknowledge within ${timeoutSec}s timeout.`;

      incident.escalationHistory.push({
        tier,
        contactName,
        contactPhone: incident.escalationState.currentContact ? incident.escalationState.currentContact.phone : "N/A",
        action: "TIMEOUT_EXCEEDED",
        reason: timeoutReason,
        timestamp: now
      });

      incident.escalationState.status = "TIMEOUT";
      await incident.save();

      await advanceEscalation(incident, timeoutReason);
    }
  } catch (err) {
    console.error("[Escalation Poller] Timeout processing error:", err.message);
  }
}

module.exports = {
  getDefaultPolicy,
  initializeEscalation,
  advanceEscalation,
  acknowledgeEscalation,
  processEscalationTimeouts
};
