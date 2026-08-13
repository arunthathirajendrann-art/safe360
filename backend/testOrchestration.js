require("dotenv").config();
const { analyzeIncident, getFallbackAssessment } = require("./services/llm/llmService");
const { canTransition } = require("./services/incidentEngine/incidentEngine");
const { getResponders, findAvailableResponder, assignResponder, releaseResponder, escalateIncident } = require("./services/escalation/escalationEngine");
const { sendNotification } = require("./services/notification/notificationEngine");

async function runTests() {
  console.log("\n==========================================");
  console.log("SAFE360 AUTOMATIC ORCHESTRATION TEST SUITE");
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

  // TEST 2: LLM Analysis Functionality
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

  // TEST 4: Escalation & Responder Assignment
  const responderList = getResponders();
  assert(Array.isArray(responderList) && responderList.length >= 3, "getResponders returns valid fleet array");

  const available = findAvailableResponder();
  assert(available !== null && available.status === "AVAILABLE", "findAvailableResponder picks available unit");

  const mockIncident = { id: "TEST-001", type: "SOS", priority: "CRITICAL" };
  const escalation = escalateIncident(mockIncident);
  assert(escalation.success === true, "escalateIncident succeeds when responder available");
  assert(escalation.responder !== null, "escalateIncident returns assigned responder object");

  // Release responder for clean state reset
  if (escalation.responder) {
    releaseResponder(escalation.responder.id);
  }

  // TEST 5: Notification Service
  const notifResult = sendNotification({ incident: mockIncident, responder: { id: "RESP-001", name: "Tactical Unit Alpha" } });
  assert(notifResult.success === true, "sendNotification executes successfully");
  assert(notifResult.provider === "DEVELOPMENT_CONSOLE_PROVIDER", "sendNotification identifies provider mode correctly");

  console.log("\n==========================================");
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
