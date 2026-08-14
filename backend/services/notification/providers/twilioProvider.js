const twilio = require("twilio");

async function sendTwilioNotification({ incident, recipient, responder, escalationTier, reason }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  const contactObj = recipient || responder;
  const contactName = contactObj ? (contactObj.name || contactObj.id || contactObj) : "Emergency Contact";
  const contactPhone = contactObj ? (contactObj.phone || "") : "";
  const incidentId = incident._id || incident.id || "INCIDENT";
  const tierLabel = escalationTier || "PRIMARY";

  if (!accountSid || !authToken || !fromNumber) {
    console.error("[TWILIO PROVIDER] Missing Twilio credentials in environment (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER).");
    return {
      success: false,
      provider: "TWILIO_SMS_PROVIDER",
      error: "Missing Twilio credentials in environment configuration",
      recipient: contactName,
      phone: contactPhone,
      escalationTier: tierLabel,
      timestamp: new Date().toISOString()
    };
  }

  if (!contactPhone || contactPhone === "N/A") {
    console.error(`[TWILIO PROVIDER] Invalid or missing recipient phone number for ${contactName}`);
    return {
      success: false,
      provider: "TWILIO_SMS_PROVIDER",
      error: `Invalid destination phone number for ${contactName}`,
      recipient: contactName,
      phone: contactPhone,
      escalationTier: tierLabel,
      timestamp: new Date().toISOString()
    };
  }

  const locationText = incident.location && incident.location.latitude
    ? `${incident.location.latitude.toFixed(4)}, ${incident.location.longitude.toFixed(4)}`
    : "Coordinates Unavailable";

  const smsMessage = `SAFE360 EMERGENCY ALERT\nIncident ID: ${incidentId}\nType: ${incident.type || "SOS"}\nPriority: ${incident.priority || "HIGH"}\nEscalation Tier: ${tierLabel}\nReason: ${reason || "Emergency Triggered"}\nLocation: ${locationText}\nTimestamp: ${new Date().toISOString()}`;

  try {
    const client = twilio(accountSid, authToken);
    const result = await client.messages.create({
      body: smsMessage,
      from: fromNumber,
      to: contactPhone
    });

    console.log(`[TWILIO PROVIDER] SMS sent successfully. Message SID: ${result.sid}`);
    return {
      success: true,
      provider: "TWILIO_SMS_PROVIDER",
      messageId: result.sid,
      message: `SMS emergency alert dispatched via Twilio to ${contactName} (${contactPhone})`,
      recipient: contactName,
      phone: contactPhone,
      escalationTier: tierLabel,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error(`[TWILIO PROVIDER] Failed to send SMS to ${contactPhone}:`, error.message);
    return {
      success: false,
      provider: "TWILIO_SMS_PROVIDER",
      error: `Twilio delivery failed: ${error.message}`,
      recipient: contactName,
      phone: contactPhone,
      escalationTier: tierLabel,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  sendTwilioNotification
};
