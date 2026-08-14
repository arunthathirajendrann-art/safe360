require("dotenv").config();
const { analyzeIncident, getFallbackAssessment } = require("./services/llm/llmService");
const { canTransition } = require("./services/incidentEngine/incidentEngine");
const { getResponders, findAvailableResponder, assignResponder, releaseResponder, escalateIncident } = require("./services/escalation/escalationEngine");
const { sendNotification } = require("./services/notification/notificationEngine");
const { initializeEscalation, advanceEscalation, acknowledgeEscalation, getDefaultPolicy } = require("./services/escalation/contactEscalationService");

async function runTests() {
  console.log("\n==========================================");
  console.log("SAFE360 ADAPTIVE ESCALATION TEST SUITE");
  console.log("==========================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${message}`);
      failed++;
    }
  }

  // TEST 1: Fallback Assessment Function
  const fallback = getFallbackAssessment({ type: "FALL", context: "User fell in hallway", detectionEvidence: { injury: true } });
  assert(fallback.priority === "HIGH", "Fallback assessment correctly identifies FALL as HIGH priority");
  assert(fallback.requiresImmediateResponse === true, "Fallback requiresImmediateResponse is true for HIGH priority");
  assert(fallback.isFallback === true, "Fallback flag is set to true");

  // TEST 2: LLM Analysis Functionality (Gemini API)
  console.log("\n[Testing LLM Service with Gemini API...]");
  const llmResult = await analyzeIncident({
    type: "SOS",
    context: "Panic button pressed 3 times, heart rate 145 bpm",
    detectionEvidence: { heartRateBpm: 145, critical: true }
  });

  assert(typeof llmResult.incidentType === "string", "LLM returned valid incidentType string");
  assert(typeof llmResult.priority === "string", "LLM returned valid priority string");
  assert(typeof llmResult.summary === "string", "LLM returned valid summary string");
  assert(typeof llmResult.requiresImmediateResponse === "boolean", "LLM returned boolean requiresImmediateResponse");

  // TEST 3: State Machine Transitions
  assert(canTransition("DETECTED", "UNDERSTOOD") === true, "VALID_TRANSITIONS allows DETECTED -> UNDERSTOOD");
  assert(canTransition("UNDERSTOOD", "ASSESSED") === true, "VALID_TRANSITIONS allows UNDERSTOOD -> ASSESSED");
  assert(canTransition("ASSESSED", "ESCALATING") === true, "VALID_TRANSITIONS allows ASSESSED -> ESCALATING");
  assert(canTransition("ESCALATING", "RESPONDER_ASSIGNED") === true, "VALID_TRANSITIONS allows ESCALATING -> RESPONDER_ASSIGNED");
  assert(canTransition("RESPONDER_ASSIGNED", "HELP_EN_ROUTE") === true, "VALID_TRANSITIONS allows RESPONDER_ASSIGNED -> HELP_EN_ROUTE");
  assert(canTransition("HELP_EN_ROUTE", "RESOLVED") === true, "VALID_TRANSITIONS allows HELP_EN_ROUTE -> RESOLVED");
  assert(canTransition("DETECTED", "RESOLVED") === false, "VALID_TRANSITIONS rejects invalid DETECTED -> RESOLVED jump");

  // TEST 4: Responder Fleet Functions
  const responderList = getResponders();
  assert(Array.isArray(responderList) && responderList.length >= 3, "getResponders returns valid fleet array");

  const available = findAvailableResponder();
  assert(available !== null && available.status === "AVAILABLE", "findAvailableResponder picks available unit");

  const mockIncident = { id: "TEST-001", type: "SOS", priority: "CRITICAL" };
  const escalation = escalateIncident(mockIncident);
  assert(escalation.success === true, "escalateIncident succeeds when responder available");
  assert(escalation.responder !== null, "escalateIncident returns assigned responder object");

  if (escalation.responder) {
    releaseResponder(escalation.responder.id);
  }

  // TEST 5: Notification Service
  const notifResult = sendNotification({
    incident: mockIncident,
    recipient: { name: "Parent / Primary Guardian", phone: "+1-555-0191" },
    escalationTier: "PRIMARY",
    reason: "CRITICAL priority incident primary contact escalation"
  });
  assert(notifResult.success === true, "sendNotification executes successfully");
  assert(notifResult.provider === "DEVELOPMENT_CONSOLE_PROVIDER", "sendNotification identifies provider mode correctly");

  // TEST 6: LOW Priority Escalation Policy
  console.log("\n[Testing Adaptive Multi-Tier Escalation Engine Policy...]");
  const lowIncidentMock = {
    type: "SOS",
    priority: "LOW",
    escalationHistory: [],
    save: async function() { return this; }
  };
  await initializeEscalation(lowIncidentMock, { priority: "LOW" });
  assert(lowIncidentMock.escalationState.currentTier === "NONE", "LOW incident initializes at tier NONE");
  assert(lowIncidentMock.escalationState.status === "PENDING", "LOW incident stays in PENDING status for monitoring");
  assert(lowIncidentMock.escalationHistory[0].reason.includes("LOW priority"), "LOW incident contains explainable reason");

  // TEST 7: HIGH Priority Initiates PRIMARY Tier
  const highIncidentMock = {
    type: "SOS",
    priority: "HIGH",
    escalationHistory: [],
    save: async function() { return this; }
  };
  await initializeEscalation(highIncidentMock, { priority: "HIGH" });
  assert(highIncidentMock.escalationState.currentTier === "PRIMARY", "HIGH incident starts at PRIMARY contact tier");
  assert(highIncidentMock.escalationState.status === "CONTACTING", "HIGH incident status is CONTACTING");
  assert(highIncidentMock.escalationHistory.length === 1, "PRIMARY contact attempt recorded in history");
  assert(highIncidentMock.escalationHistory[0].reason.includes("HIGH priority"), "History item includes human-readable reason");

  // TEST 8: Timeout Advances PRIMARY -> SECONDARY
  await advanceEscalation(highIncidentMock, "Primary contact did not respond within 15s timeout.");
  assert(highIncidentMock.escalationState.currentTier === "SECONDARY", "Primary timeout advances escalation to SECONDARY tier");
  assert(highIncidentMock.escalationHistory.length === 2, "SECONDARY escalation recorded in history");
  assert(highIncidentMock.escalationHistory[1].action === "ESCALATED_NEXT_TIER", "Action recorded as ESCALATED_NEXT_TIER");

  // TEST 9: Timeout Advances SECONDARY -> TERTIARY
  await advanceEscalation(highIncidentMock, "Secondary contact did not respond within 15s timeout.");
  assert(highIncidentMock.escalationState.currentTier === "TERTIARY", "Secondary timeout advances escalation to TERTIARY tier");
  assert(highIncidentMock.escalationHistory.length === 3, "TERTIARY escalation recorded in history");

  // TEST 10: Timeout Advances TERTIARY -> RESPONDER_FLEET Pathway
  await advanceEscalation(highIncidentMock, "Tertiary contact did not respond within 15s timeout; dispatching tactical fleet.");
  assert(highIncidentMock.escalationState.currentTier === "RESPONDER_FLEET", "Tertiary timeout advances to RESPONDER_FLEET pathway");
  assert(highIncidentMock.status === "RESPONDER_ASSIGNED", "Incident status updated to RESPONDER_ASSIGNED");
  assert(highIncidentMock.escalationHistory.length === 4, "RESPONDER_FLEET dispatch recorded in history");
  assert(highIncidentMock.escalationHistory[3].action === "DISPATCHED_RESPONDER", "Action recorded as DISPATCHED_RESPONDER");

  // TEST 11: CRITICAL Priority Multi-Tier Contact Policy
  const criticalIncidentMock = {
    type: "SOS",
    priority: "CRITICAL",
    escalationHistory: [],
    save: async function() { return this; }
  };
  await initializeEscalation(criticalIncidentMock, { priority: "CRITICAL" });
  assert(criticalIncidentMock.escalationState.currentTier === "PRIMARY", "CRITICAL incident initiates at PRIMARY tier");
  assert(criticalIncidentMock.escalationState.timeoutAt !== null, "CRITICAL incident assigns response timeout date");
  assert(criticalIncidentMock.escalationHistory[0].reason.includes("CRITICAL priority"), "CRITICAL history records human-readable reason");

  console.log("\n==========================================");
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
