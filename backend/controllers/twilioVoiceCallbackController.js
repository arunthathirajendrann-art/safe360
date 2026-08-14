const Incident = require("../models/Incident");
const { getCallSidInfo } = require("../services/notification/providers/twilioVoiceProvider");

const handleTwilioVoiceStatusCallback = async (req, res) => {
  try {
    const { CallSid, CallStatus, To, Duration } = req.body;

    console.log(`[TWILIO VOICE CALLBACK] Webhook received for CallSid: ${CallSid}, CallStatus: ${CallStatus}`);

    if (!CallSid) {
      return res.status(400).send("<Response/>");
    }

    const sidInfo = getCallSidInfo(CallSid);

    let incident = null;
    if (sidInfo && sidInfo.incidentId) {
      incident = await Incident.findById(sidInfo.incidentId);
    } else {
      // Fallback search by callSid in history or escalationState
      incident = await Incident.findOne({
        $or: [
          { "escalationState.callSid": CallSid },
          { "escalationHistory.callSid": CallSid }
        ]
      });
    }

    if (incident) {
      const tier = sidInfo ? sidInfo.tier : (incident.escalationState?.currentTier || "PRIMARY");
      const statusLower = (CallStatus || "").toLowerCase();

      // Track status update in escalation history
      incident.escalationHistory.push({
        tier,
        contactName: incident.escalationState?.currentContact?.name || "Contact",
        contactPhone: To || incident.escalationState?.currentContact?.phone || "N/A",
        action: statusLower === "in-progress" || statusLower === "completed" || statusLower === "answered"
          ? "CALL_ANSWERED"
          : statusLower === "no-answer" || statusLower === "busy" || statusLower === "failed"
          ? "CALL_UNANSWERED"
          : "CALL_STATUS_UPDATE",
        reason: `Twilio status callback received: call status is '${CallStatus}' (Duration: ${Duration || 0}s).`,
        callSid: CallSid,
        callStatus: CallStatus,
        provider: "TWILIO_VOICE_PROVIDER",
        timestamp: new Date()
      });

      // If call is answered / in-progress, auto acknowledge if configured
      if (statusLower === "in-progress" || statusLower === "answered") {
        incident.escalationState.status = "ACKNOWLEDGED";
        incident.escalationState.responseStatus = "ANSWERED_CALL";
        incident.escalationState.acknowledgedAt = new Date();
        incident.escalationState.escalationReason = `Voice call answered by contact at ${tier} tier. Escalation sequence halted.`;
      }

      await incident.save();
    }

    res.type("text/xml").send("<Response/>");

  } catch (error) {
    console.error("[TWILIO VOICE CALLBACK ERROR]:", error.message);
    res.status(500).send("<Response/>");
  }
};

const handleTwilioVoiceTwiML = (req, res) => {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Safe 360 emergency alert. A protected person may require assistance. Please acknowledge the emergency.</Say>
</Response>`;
  res.type("text/xml").send(twiml);
};

module.exports = {
  handleTwilioVoiceStatusCallback,
  handleTwilioVoiceTwiML
};
