require("dotenv").config();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { analyzeIncident, getFallbackAssessment } = require("./services/llm/llmService");
const { canTransition } = require("./services/incidentEngine/incidentEngine");
const { evaluateSafetyRisk } = require("./services/incidentEngine/riskEngine");
const { getResponders, findAvailableResponder, assignResponder, releaseResponder, escalateIncident } = require("./services/escalation/escalationEngine");
const { sendNotification } = require("./services/notification/notificationEngine");
const { sendTwilioNotification } = require("./services/notification/providers/twilioProvider");
const { sendTwilioVoiceNotification, registerCallSid } = require("./services/notification/providers/twilioVoiceProvider");
const { initializeEscalation, advanceEscalation, acknowledgeEscalation, getDefaultPolicy, getPolicyForUser } = require("./services/escalation/contactEscalationService");
const { JWT_SECRET } = require("./middleware/authMiddleware");

async function runTests() {
  console.log("\n==========================================");
  console.log("SAFE360 ADAPTIVE ESCALATION & AUTHENTICATED GUARDIAN TEST SUITE");
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
  assert(fallback.priority === "HIGH" || fallback.priority === "CRITICAL", "Fallback assessment correctly identifies FALL as HIGH/CRITICAL priority");
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

  // TEST 5: Notification Service & Provider Resolution
  console.log("\n[Testing Notification Service & Provider Modes...]");
  const consoleNotif = await sendNotification({
    incident: mockIncident,
    recipient: { name: "Parent / Primary Guardian", phone: "+1-555-0191" },
    reason: "CRITICAL priority incident primary contact escalation",
    tier: "PRIMARY"
  });
  assert(Boolean(consoleNotif), "Notification service dispatches response payload");
  assert(Boolean(consoleNotif.provider), "Notification provider mode resolved");

  // TEST 6: Authentication & Password Security
  console.log("\n[Testing User Account System & Auth Security...]");
  const testPassword = "SecureUserPass123!";
  const hash = await bcrypt.hash(testPassword, 10);
  const isValidPass = await bcrypt.compare(testPassword, hash);
  assert(isValidPass === true, "Password hashing and verification operates securely");

  const tokenPayload = { userId: "USR-TEST-99", email: "test@safe360.internal" };
  const testToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "1h" });
  const decoded = jwt.verify(testToken, JWT_SECRET);
  assert(decoded.userId === "USR-TEST-99", "JWT token signing and verification operates correctly");

  // TEST 7: Dynamic User Contact Escalation Resolution
  console.log("\n[Testing Dynamic User Contact Escalation Resolution...]");
  const userPolicy = await getPolicyForUser("NON_EXISTENT_USER_ID_12345");
  assert(userPolicy.primaryContact !== null && Boolean(userPolicy.primaryContact.name), "getPolicyForUser falls back safely to default policy when user has no DB contacts");

  // TEST 8: Twilio Voice Provider Test Mode & Call SID Generation
  console.log("\n[Testing Twilio Voice Provider & Call SID Tracking...]");
  const twilioVoiceResult = await sendTwilioVoiceNotification({
    incident: { id: "TEST-VOICE-99", type: "SOS", priority: "CRITICAL" },
    recipient: { name: "Parent / Primary Guardian", phone: "+15550191" },
    reason: "Voice emergency call test"
  });
  assert(twilioVoiceResult.success === true, "Twilio Voice provider returns success=true in test mode");
  assert(twilioVoiceResult.provider === "TWILIO_VOICE_PROVIDER", "Twilio Voice provider identifies TWILIO_VOICE_PROVIDER");
  assert(typeof twilioVoiceResult.callSid === "string" && twilioVoiceResult.callSid.startsWith("CA_"), "Twilio Voice provider generates valid Call SID");
  assert(twilioVoiceResult.status === "queued", "Twilio Voice provider tracks initial callStatus as queued");

  // TEST 9: LOW Priority Escalation Policy Initialization
  console.log("\n[Testing Adaptive Multi-Tier Escalation Engine Policy...]");
  const lowIncidentMock = {
    _id: "507f191e810c19729de860e9",
    type: "MONITORING",
    priority: "LOW",
    status: "DETECTED",
    escalationState: {},
    escalationHistory: [],
    save: async function() { return this; }
  };
  await initializeEscalation(lowIncidentMock);
  assert(lowIncidentMock.escalationState.currentTier === "NONE", "LOW incident initializes at tier NONE");
  assert(lowIncidentMock.escalationState.status === "PENDING", "LOW incident stays in PENDING status for monitoring");

  // TEST 10: HIGH Priority Escalation Policy Initialization & Primary Dispatch
  const highIncidentMock = {
    _id: "507f191e810c19729de860ea",
    type: "SOS",
    priority: "HIGH",
    status: "DETECTED",
    escalationState: {},
    escalationHistory: [],
    save: async function() { return this; }
  };
  await initializeEscalation(highIncidentMock);
  assert(highIncidentMock.escalationState.currentTier === "PRIMARY", "HIGH incident starts at PRIMARY contact tier");
  assert(highIncidentMock.escalationState.status === "CONTACTING", "HIGH incident status is CONTACTING");
  assert(highIncidentMock.escalationHistory.length === 1, "PRIMARY contact attempt recorded in history");

  // TEST 11: Primary Timeout / No-Answer Advances to SECONDARY
  await advanceEscalation(highIncidentMock, "Primary contact did not respond within 15s timeout.");
  assert(highIncidentMock.escalationState.currentTier === "SECONDARY", "Primary timeout advances escalation to SECONDARY tier");
  assert(highIncidentMock.escalationHistory.length === 2, "SECONDARY escalation recorded in history");

  // TEST 12: Secondary Timeout / No-Answer Advances to TERTIARY
  await advanceEscalation(highIncidentMock, "Secondary contact did not respond within 15s timeout.");
  assert(highIncidentMock.escalationState.currentTier === "TERTIARY", "Secondary timeout advances escalation to TERTIARY tier");
  assert(highIncidentMock.escalationHistory.length === 3, "TERTIARY escalation recorded in history");

  // TEST 13: Tertiary Timeout / No-Answer Dispatches RESPONDER_FLEET
  await advanceEscalation(highIncidentMock, "Tertiary contact did not respond within 15s timeout; dispatching tactical fleet.");
  assert(highIncidentMock.escalationState.currentTier === "RESPONDER_FLEET", "Tertiary timeout advances to RESPONDER_FLEET pathway");
  assert(highIncidentMock.status === "RESPONDER_ASSIGNED", "Incident status updated to RESPONDER_ASSIGNED");

  // TEST 14: Answered / Acknowledged Call Halts Escalation
  console.log("\n[Testing Answered Call Acknowledgement Halting Escalation...]");
  const ackIncidentMock = {
    _id: "507f191e810c19729de860ea",
    type: "SOS",
    priority: "CRITICAL",
    escalationState: { currentTier: "PRIMARY", currentContact: { name: "Parent / Primary Guardian", phone: "+1-555-0191" } },
    escalationHistory: [],
    save: async function() { return this; }
  };

  const originalFindById = require("./models/Incident").findById;
  require("./models/Incident").findById = async function() { return ackIncidentMock; };

  await acknowledgeEscalation(ackIncidentMock._id, "PRIMARY", "CNT-PRIMARY-01");
  assert(ackIncidentMock.escalationState.status === "ACKNOWLEDGED", "Acknowledged call sets escalation state status to ACKNOWLEDGED");
  assert(ackIncidentMock.escalationHistory.some(h => h.action === "ACKNOWLEDGED"), "ACKNOWLEDGED action recorded in escalation history");

  // TEST 15: Phase 5 Multi-Signal Safety Risk Isolation Tests
  console.log("\n[Testing Phase 5 Multi-Signal Risk Isolation & Evidence Mapping...]");

  // 11.A: SOS_BUTTON -> CRITICAL, confidence 99, requiresImmediateResponse, NO route evidence
  const sosRisk = evaluateSafetyRisk({ type: "SOS", source: "MANUAL_SOS", context: "Panic button pressed" });
  assert(sosRisk.priority === "CRITICAL", "11.A: Manual SOS returns CRITICAL priority");
  assert(sosRisk.confidence === 99, "11.A: Manual SOS returns 99% confidence");
  assert(!sosRisk.assessmentReason.includes("Route Corridor"), "11.A: Manual SOS contains NO route corridor evidence");

  const sosFallback = getFallbackAssessment({ type: "SOS", context: "SOS panic" });
  assert(sosFallback.incidentType === "SOS", "11.A: Fallback assessment returns incidentType SOS");
  assert(sosFallback.priority === "CRITICAL", "11.A: Fallback assessment returns CRITICAL priority");
  assert(sosFallback.requiresImmediateResponse === true, "11.A: Fallback assessment returns requiresImmediateResponse true");

  // 11.B: FALL_DETECTION -> fall evidence only
  const fallRisk = evaluateSafetyRisk({
    type: "FALL_DETECTION",
    sensorEvidence: { impactMagnitude: 3.8, inactivityDuration: 10, orientationDelta: 60 }
  });
  assert(fallRisk.priority === "HIGH" || fallRisk.priority === "CRITICAL", "11.B: Fall Detection evaluates sensor evidence to HIGH/CRITICAL priority");
  assert(fallRisk.riskFactors.some(f => f.includes("Impact Acceleration")), "11.B: Fall Detection includes impact acceleration factor");
  assert(!fallRisk.riskFactors.some(f => f.includes("Route Corridor")), "11.B: Fall Detection contains NO route corridor evidence");

  // 11.C: ROUTE_DEVIATION -> route evidence only
  const routeRisk = evaluateSafetyRisk({
    type: "ROUTE_DEVIATION",
    locationEvidence: { corridorDistanceMeters: 145, durationOutsideSeconds: 90, gpsAccuracy: 12 }
  });
  assert(routeRisk.priority === "MEDIUM" || routeRisk.priority === "HIGH", "11.C: Route Deviation evaluates route evidence");
  assert(routeRisk.riskFactors.some(f => f.includes("Route Corridor Deviation")), "11.C: Route Deviation includes route factor");
  assert(!routeRisk.riskFactors.some(f => f.includes("Impact Acceleration")), "11.C: Route Deviation contains NO fall sensor evidence");

  // 11.D: MISSED_CHECKIN -> check-in evidence only
  const checkinRisk = evaluateSafetyRisk({
    type: "MISSED_CHECKIN",
    checkInEvidence: { missedDurationSeconds: 900 }
  });
  assert(checkinRisk.riskFactors.some(f => f.includes("Missed Safety Check-in")), "11.D: Missed Check-in includes check-in factor");
  assert(!checkinRisk.riskFactors.some(f => f.includes("Route Corridor")), "11.D: Missed Check-in contains NO route evidence");

  // 11.E: STEALTH_SOS -> critical/high emergency
  const stealthRisk = evaluateSafetyRisk({ type: "STEALTH_SOS" });
  assert(stealthRisk.priority === "CRITICAL", "11.E: Stealth SOS returns CRITICAL priority");
  assert(stealthRisk.confidence === 95, "11.E: Stealth SOS returns 95% confidence");

  const stealthFb = getFallbackAssessment({ type: "STEALTH_SOS", context: "Discreet trigger" });
  assert(stealthFb.incidentType === "STEALTH_SOS", "11.E: Stealth SOS fallback returns incidentType STEALTH_SOS");
  assert(stealthFb.requiresImmediateResponse === true, "11.E: Stealth SOS requiresImmediateResponse is true");

  // 11.F: VOICE_SOS "help" -> emergency intent even when LLM is unavailable
  const voiceRisk = evaluateSafetyRisk({ type: "VOICE_SOS", voiceEvidence: { transcript: "Help me emergency" } });
  assert(voiceRisk.priority === "HIGH" || voiceRisk.priority === "CRITICAL", "11.F: Voice SOS help phrase returns HIGH/CRITICAL priority");

  const voiceFb = getFallbackAssessment({ type: "VOICE_SOS", context: "Help me, I need emergency assistance" });
  assert(voiceFb.incidentType === "VOICE_SOS", "11.F: Voice SOS fallback returns incidentType VOICE_SOS (NEVER UNKNOWN)");
  assert(voiceFb.requiresImmediateResponse === true, "11.F: Voice SOS help phrase requiresImmediateResponse is true");

  // 12: Cross-Contamination Isolation Test
  const cleanSos = evaluateSafetyRisk({ type: "SOS", detectionEvidence: { source: "MOBILE_APP", trigger: "SOS_BUTTON" } });
  assert(!cleanSos.assessmentReason.includes("Route Corridor"), "12: Clean SOS payload has ZERO route corridor evidence");
  assert(!cleanSos.assessmentReason.includes("Impact Acceleration"), "12: Clean SOS payload has ZERO fall evidence");
  assert(cleanSos.priority === "CRITICAL", "12: Clean SOS payload maintains CRITICAL priority");

  // TEST 16: Explicit Originating Trigger Mapping & Validation Tests
  console.log("\n[Testing Explicit Originating Trigger Mapping & Validation...]");

  // 1. Route Alert: type = ROUTE_DEVIATION, trigger = ROUTE_ALERT, route evidence present, SOS evidence absent
  const routeTriggerFb = getFallbackAssessment({ type: "ROUTE_DEVIATION", context: "Off path" });
  assert(routeTriggerFb.incidentType === "ROUTE_DEVIATION", "1. Route Alert incidentType resolves to ROUTE_DEVIATION");

  // 2. Manual SOS: type = MANUAL_SOS, trigger = SOS_BUTTON, priority = CRITICAL, confidence = 99
  const manualSosRisk = evaluateSafetyRisk({ type: "MANUAL_SOS" });
  assert(manualSosRisk.priority === "CRITICAL", "2. Manual SOS priority is CRITICAL");
  assert(manualSosRisk.confidence === 99, "2. Manual SOS confidence is 99%");

  // 3. Fall: type = FALL_DETECTION, trigger = FALL_DETECTION
  const fallTriggerFb = getFallbackAssessment({ type: "FALL_DETECTION", context: "Fall impact" });
  assert(fallTriggerFb.incidentType === "FALL_DETECTION", "3. Fall incidentType resolves to FALL_DETECTION");

  // 4. Stealth: type = STEALTH_SOS, trigger = STEALTH_SOS
  const stealthTriggerFb = getFallbackAssessment({ type: "STEALTH_SOS", context: "Discreet trigger" });
  assert(stealthTriggerFb.incidentType === "STEALTH_SOS", "4. Stealth incidentType resolves to STEALTH_SOS");

  // 5. Voice: type = VOICE_SOS, trigger = VOICE_SOS
  const voiceTriggerFb = getFallbackAssessment({ type: "VOICE_SOS", context: "Help me emergency" });
  assert(voiceTriggerFb.incidentType === "VOICE_SOS", "5. Voice incidentType resolves to VOICE_SOS");

  // 6. Check-in: type = MISSED_CHECKIN, trigger = CHECK_IN_TIMEOUT
  const checkinTriggerFb = getFallbackAssessment({ type: "MISSED_CHECKIN", context: "Missed deadline" });
  assert(checkinTriggerFb.incidentType === "MISSED_CHECKIN", "6. Check-in incidentType resolves to MISSED_CHECKIN");

  // TEST 17: Missed Check-in End-to-End Safety Flow & Duplicate Protection
  console.log("\n[Testing Missed Check-in Safety Flow & Duplicate Protection...]");
  const { scheduleCheckIn, respondToCheckIn, processExpiredCheckIns, checkInSessions } = require("./services/checkin/checkInService");

  // Test A: Schedule check-in -> press CHECK IN NOW -> status CHECKED_IN, 0 incidents
  const sessionA = await scheduleCheckIn({ userId: "USR-TEST-CHECKIN-A", intervalMinutes: 30 });
  assert(sessionA.status === "SCHEDULED", "Test A: Check-in session initializes in SCHEDULED status");

  const respondResA = await respondToCheckIn("USR-TEST-CHECKIN-A");
  assert(respondResA.success === true, "Test A: respondToCheckIn returns success=true");
  assert(respondResA.message === "Safety check-in recorded.", "Test A: respondToCheckIn message is 'Safety check-in recorded.'");
  const statusA = checkInSessions.get("USR-TEST-CHECKIN-A");
  assert(statusA && statusA.status === "CHECKED_IN", "Test A: Session status updated to CHECKED_IN");

  // Test B: Schedule expired check-in -> processExpiredCheckIns -> exactly 1 MISSED_CHECKIN incident
  const sessionB = await scheduleCheckIn({ userId: "USR-TEST-CHECKIN-B", intervalMinutes: -1, isSimulated: true });
  assert(sessionB.deadline < new Date(), "Test B: Session B deadline is in the past (expired)");

  const createdIncidentsB = await processExpiredCheckIns();
  assert(createdIncidentsB.length >= 1, "Test B: Expired check-in worker created at least 1 incident");
  const incidentB = createdIncidentsB.find(inc => inc.userId === "USR-TEST-CHECKIN-B");
  assert(incidentB !== undefined, "Test B: MISSED_CHECKIN incident created for user B");
  assert(incidentB.type === "MISSED_CHECKIN", "Test B: Incident type is MISSED_CHECKIN");
  assert(incidentB.source === "MISSED_CHECKIN", "Test B: Incident source is MISSED_CHECKIN");
  assert(incidentB.detectionEvidence.trigger === "CHECK_IN_TIMEOUT", "Test B: Trigger is CHECK_IN_TIMEOUT");

  // Test C: Run expiration worker again -> verify 0 duplicate incidents created for user B
  const createdIncidentsC = await processExpiredCheckIns();
  const duplicateIncidentsC = createdIncidentsC.filter(inc => inc.userId === "USR-TEST-CHECKIN-B");
  assert(duplicateIncidentsC.length === 0, "Test C: Duplicate protection verified — 0 duplicate incidents created on second run");

  // Test D: Verify existing escalation engine receives MISSED_CHECKIN incident normally
  assert(incidentB.escalationState !== undefined, "Test D: MISSED_CHECKIN incident initialized escalationState");
  assert(incidentB.status === "ESCALATING" || incidentB.status === "ASSESSED", "Test D: Incident status transitioned through escalation ladder");

  // Test E: Prove fresh MISSED_CHECKIN incident always produces llmAssessment.incidentType: "MISSED_CHECKIN"
  const missedCheckInLlm = await analyzeIncident({
    type: "MISSED_CHECKIN",
    context: "Protected person did not complete the scheduled safety check-in before the deadline.",
    detectionEvidence: { source: "MISSED_CHECKIN", trigger: "CHECK_IN_TIMEOUT" }
  });
  assert(missedCheckInLlm.incidentType === "MISSED_CHECKIN", "Test E: analyzeIncident returns incidentType: 'MISSED_CHECKIN'");
  assert(missedCheckInLlm.incidentType !== "UNKNOWN", "Test E: analyzeIncident NEVER returns incidentType: 'UNKNOWN'");
  assert(incidentB.detectionEvidence?.llmAssessment?.incidentType === "MISSED_CHECKIN", "Test E: Fresh MISSED_CHECKIN incident produces llmAssessment.incidentType: 'MISSED_CHECKIN'");

  console.log("\n==========================================");
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
