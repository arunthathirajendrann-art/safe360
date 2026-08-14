require("dotenv").config();
const { analyzeIncident, getFallbackAssessment } = require("./services/llm/llmService");
const { canTransition } = require("./services/incidentEngine/incidentEngine");
const { getResponders, findAvailableResponder, assignResponder, releaseResponder, escalateIncident } = require("./services/escalation/escalationEngine");
const { sendNotification } = require("./services/notification/notificationEngine");
const { sendTwilioNotification } = require("./services/notification/providers/twilioProvider");
const { sendTwilioVoiceNotification, registerCallSid } = require("./services/notification/providers/twilioVoiceProvider");
const { initializeEscalation, advanceEscalation, acknowledgeEscalation, getDefaultPolicy } = require("./services/escalation/contactEscalationService");

async function runTests() {
  console.log("\n==========================================");
  console.log("SAFE360 ADAPTIVE ESCALATION & REAL VOICE PROVIDER TEST SUITE");
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

  // TEST 5: Console Provider
  process.env.NOTIFICATION_PROVIDER = "console";
  const notifResult = await sendNotification({
    incident: mockIncident,
    recipient: { name: "Parent / Primary Guardian", phone: "+1-555-0191" },
    escalationTier: "PRIMARY",
    reason: "CRITICAL priority incident primary contact escalation"
  });
  assert(notifResult.success === true, "Console provider executes successfully");
  assert(notifResult.provider === "DEVELOPMENT_CONSOLE_PROVIDER", "Console provider identifies DEVELOPMENT_CONSOLE_PROVIDER mode");

  // TEST 6: Invalid Provider Mode Router Fallback
  process.env.NOTIFICATION_PROVIDER = "invalid_mode";
  const invalidModeResult = await sendNotification({
    incident: mockIncident,
    recipient: { name: "Parent / Primary Guardian", phone: "+1-555-0191" },
    escalationTier: "PRIMARY",
    reason: "Test invalid mode fallback"
  });
  assert(invalidModeResult.providerWarning !== undefined, "Invalid provider mode triggers fallback warning");
  assert(invalidModeResult.provider === "DEVELOPMENT_CONSOLE_PROVIDER", "Invalid provider mode falls back to DEVELOPMENT_CONSOLE_PROVIDER");

  // TEST 7: Twilio SMS Provider Credential Validation
  const twilioSmsValidation = await sendTwilioNotification({
    incident: mockIncident,
    recipient: { name: "Parent / Primary Guardian", phone: "+1-555-0191" },
    escalationTier: "PRIMARY",
    reason: "Testing Twilio SMS validation without credentials"
  });
  assert(twilioSmsValidation.success === false, "Twilio SMS provider returns success=false when credentials are missing");
  assert(twilioSmsValidation.provider === "TWILIO_SMS_PROVIDER", "Twilio SMS provider identifies TWILIO_SMS_PROVIDER");

  // TEST 8: Twilio Voice Provider Test Mode & Structured Response
  console.log("\n[Testing Twilio Voice Provider & Call SID Tracking...]");
  process.env.NOTIFICATION_PROVIDER = "twilio_voice";
  process.env.TWILIO_VOICE_TEST_MODE = "true";

  const voiceTestResult = await sendNotification({
    incident: mockIncident,
    recipient: { name: "Parent / Primary Guardian", phone: "+1-555-0191" },
    escalationTier: "PRIMARY",
    reason: "Safe360 emergency alert. Please acknowledge this alert."
  });

  assert(voiceTestResult.success === true, "Twilio Voice provider returns success=true in test mode");
  assert(voiceTestResult.provider === "TWILIO_VOICE_PROVIDER", "Twilio Voice provider identifies TWILIO_VOICE_PROVIDER");
  assert(typeof voiceTestResult.callSid === "string" && voiceTestResult.callSid.startsWith("CA_SIM_"), "Twilio Voice provider generates valid Call SID");
  assert(voiceTestResult.callStatus === "queued", "Twilio Voice provider tracks initial callStatus as queued");

  // TEST 9: Twilio Voice Credential Failure Safety (Without test mode)
  process.env.TWILIO_VOICE_TEST_MODE = "false";
  const voiceCredFail = await sendNotification({
    incident: mockIncident,
    recipient: { name: "Parent / Primary Guardian", phone: "+1-555-0191" },
    escalationTier: "PRIMARY",
    reason: "Testing voice credential validation"
  });

  assert(voiceCredFail.success === false, "Twilio Voice provider fails safely when credentials missing");
  assert(voiceCredFail.error.includes("Missing Twilio credentials"), "Twilio Voice reports missing credentials error");
  assert(voiceCredFail.callStatus === "failed", "Twilio Voice sets callStatus to failed on error");

  // Reset back to console mode for policy tests
  process.env.NOTIFICATION_PROVIDER = "console";
  process.env.TWILIO_VOICE_TEST_MODE = "true";

  // TEST 10: LOW Priority Escalation Policy
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

  // TEST 11: HIGH Priority Initiates PRIMARY Tier Voice Call
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

  // TEST 12: Primary Timeout / No-Answer Advances to SECONDARY
  await advanceEscalation(highIncidentMock, "Primary contact did not respond within 15s timeout.");
  assert(highIncidentMock.escalationState.currentTier === "SECONDARY", "Primary timeout advances escalation to SECONDARY tier");
  assert(highIncidentMock.escalationHistory.length === 2, "SECONDARY escalation recorded in history");

  // TEST 13: Secondary Timeout / No-Answer Advances to TERTIARY
  await advanceEscalation(highIncidentMock, "Secondary contact did not respond within 15s timeout.");
  assert(highIncidentMock.escalationState.currentTier === "TERTIARY", "Secondary timeout advances escalation to TERTIARY tier");
  assert(highIncidentMock.escalationHistory.length === 3, "TERTIARY escalation recorded in history");

  // TEST 14: Tertiary Timeout / No-Answer Dispatches RESPONDER_FLEET
  await advanceEscalation(highIncidentMock, "Tertiary contact did not respond within 15s timeout; dispatching tactical fleet.");
  assert(highIncidentMock.escalationState.currentTier === "RESPONDER_FLEET", "Tertiary timeout advances to RESPONDER_FLEET pathway");
  assert(highIncidentMock.status === "RESPONDER_ASSIGNED", "Incident status updated to RESPONDER_ASSIGNED");

  // TEST 15: Answered / Acknowledged Call Halts Escalation
  console.log("\n[Testing Answered Call Acknowledgement Halting Escalation...]");
  const ackIncidentMock = {
    _id: "507f191e810c19729de860ea",
    type: "SOS",
    priority: "CRITICAL",
    escalationState: { currentTier: "PRIMARY", currentContact: { name: "Parent / Primary Guardian", phone: "+1-555-0191" } },
    escalationHistory: [],
    save: async function() { return this; }
  };

  // Mock finding document in acknowledgeEscalation
  const originalFindById = require("./models/Incident").findById;
  require("./models/Incident").findById = async function() { return ackIncidentMock; };

  await acknowledgeEscalation(ackIncidentMock._id, "PRIMARY", "CNT-PRIMARY-01");
  assert(ackIncidentMock.escalationState.status === "ACKNOWLEDGED", "Acknowledged call sets escalation state status to ACKNOWLEDGED");
  assert(ackIncidentMock.escalationHistory.some(h => h.action === "ACKNOWLEDGED"), "ACKNOWLEDGED action recorded in escalation history");

  // Restore findById
  require("./models/Incident").findById = originalFindById;

  console.log("\n==========================================");
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
