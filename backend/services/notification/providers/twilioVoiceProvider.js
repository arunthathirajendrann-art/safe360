const twilio = require("twilio");

// In-memory mapping of CallSid -> { incidentId, tier, contactPhone }
const callSidMap = new Map();

function registerCallSid(callSid, incidentId, tier, phone) {
  if (callSid && incidentId) {
    callSidMap.set(callSid, { incidentId, tier, phone, createdAt: new Date() });
  }
}

function getCallSidInfo(callSid) {
  return callSidMap.get(callSid);
}

async function sendTwilioVoiceNotification({ incident, recipient, responder, escalationTier, reason }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  const statusCallbackUrl = process.env.TWILIO_VOICE_STATUS_CALLBACK_URL;
  const isTestMode = process.env.TWILIO_VOICE_TEST_MODE === "true";
  const timeoutSec = parseInt(process.env.ESCALATION_TIMEOUT_SECONDS || "15", 10);

  const contactObj = recipient || responder;
  const contactName = contactObj ? (contactObj.name || contactObj.id || contactObj) : "Emergency Contact";
  const contactPhone = contactObj ? (contactObj.phone || "") : "";
  const incidentId = incident._id || incident.id || "INCIDENT";
  const tierLabel = escalationTier || "PRIMARY";
  const priorityLabel = incident.priority || "HIGH";

  const latitude = incident.location && incident.location.latitude ? incident.location.latitude.toFixed(4) : "unknown";
  const longitude = incident.location && incident.location.longitude ? incident.location.longitude.toFixed(4) : "unknown";

  const spokenText = `Safe 360 emergency alert. This is an emergency notification for incident ${incidentId}. The detected priority is ${priorityLabel}. Reason: ${reason || "Emergency alert triggered"}. Location: latitude ${latitude}, longitude ${longitude}. Please acknowledge this emergency alert.`;

  // Test mode simulation (used when explicitly testing without network calls)
  if (isTestMode) {
    const simulatedSid = `CA_SIM_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    registerCallSid(simulatedSid, incidentId, tierLabel, contactPhone);
    console.log(`[TWILIO VOICE PROVIDER - TEST MODE] Simulated voice call to ${contactName} (${contactPhone}). Call SID: ${simulatedSid}`);
    return {
      success: true,
      provider: "TWILIO_VOICE_PROVIDER",
      callSid: simulatedSid,
      callStatus: "queued",
      status: "queued",
      message: `Simulated voice call placed to ${contactName} (${contactPhone})`,
      recipient: contactName,
      phone: contactPhone,
      escalationTier: tierLabel,
      reason: reason || "Emergency Call Triggered",
      timestamp: new Date().toISOString(),
      error: null
    };
  }

  if (!accountSid || !authToken || !fromNumber) {
    console.error("[TWILIO VOICE PROVIDER] Missing Twilio credentials in environment (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER).");
    return {
      success: false,
      provider: "TWILIO_VOICE_PROVIDER",
      callSid: null,
      callStatus: "failed",
      status: "failed",
      error: "Missing Twilio credentials in environment configuration",
      recipient: contactName,
      phone: contactPhone,
      escalationTier: tierLabel,
      timestamp: new Date().toISOString()
    };
  }

  if (!contactPhone || contactPhone === "N/A") {
    console.error(`[TWILIO VOICE PROVIDER] Invalid or missing destination phone number for ${contactName}`);
    return {
      success: false,
      provider: "TWILIO_VOICE_PROVIDER",
      callSid: null,
      callStatus: "failed",
      status: "failed",
      error: `Invalid destination phone number for ${contactName}`,
      recipient: contactName,
      phone: contactPhone,
      escalationTier: tierLabel,
      timestamp: new Date().toISOString()
    };
  }

  try {
    const client = twilio(accountSid, authToken);
    const twimlPayload = `<Response><Say voice="alice">${spokenText}</Say></Response>`;

    const callOptions = {
      twiml: twimlPayload,
      to: contactPhone,
      from: fromNumber,
      timeout: timeoutSec
    };

    if (statusCallbackUrl && statusCallbackUrl.trim().length > 0) {
      callOptions.statusCallback = statusCallbackUrl.trim();
      callOptions.statusCallbackEvent = ["initiated", "ringing", "answered", "completed"];
      callOptions.statusCallbackMethod = "POST";
      console.log(`[TWILIO VOICE PROVIDER] Registered status callback URL: ${statusCallbackUrl}`);
    } else {
      console.log(`[TWILIO VOICE PROVIDER] TWILIO_VOICE_STATUS_CALLBACK_URL not configured. Call will proceed without remote webhook callbacks.`);
    }

    const call = await client.calls.create(callOptions);
    registerCallSid(call.sid, incidentId, tierLabel, contactPhone);

    console.log(`[TWILIO VOICE PROVIDER] Real voice call initiated to ${contactName} (${contactPhone}). Call SID: ${call.sid}, Status: ${call.status}`);
    return {
      success: true,
      provider: "TWILIO_VOICE_PROVIDER",
      callSid: call.sid,
      callStatus: call.status || "queued",
      status: call.status || "queued",
      message: `Outbound Twilio voice call initiated to ${contactName} (${contactPhone})`,
      recipient: contactName,
      phone: contactPhone,
      escalationTier: tierLabel,
      reason: reason || "Emergency Call Triggered",
      timestamp: new Date().toISOString(),
      error: null
    };

  } catch (error) {
    console.error(`[TWILIO VOICE PROVIDER] Failed to place call to ${contactPhone}:`, error.message);
    return {
      success: false,
      provider: "TWILIO_VOICE_PROVIDER",
      callSid: null,
      callStatus: "failed",
      status: "failed",
      error: `Twilio Voice call failed: ${error.message}`,
      recipient: contactName,
      phone: contactPhone,
      escalationTier: tierLabel,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  sendTwilioVoiceNotification,
  registerCallSid,
  getCallSidInfo
};
