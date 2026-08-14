const mongoose = require("mongoose");
const { sendConsoleNotification } = require("./providers/consoleProvider");
const { sendTwilioNotification } = require("./providers/twilioProvider");
const { sendTwilioVoiceNotification } = require("./providers/twilioVoiceProvider");
const NotificationLog = require("../../models/NotificationLog");

async function sendNotification(params = {}) {
  const providerMode = (process.env.NOTIFICATION_PROVIDER || process.env.VOICE_NOTIFICATION_PROVIDER || "console").toLowerCase().trim();
  let result;

  if (providerMode === "twilio_voice") {
    result = await sendTwilioVoiceNotification(params);
  } else if (providerMode === "twilio" || providerMode === "twilio_sms") {
    result = await sendTwilioNotification(params);
  } else {
    if (providerMode !== "console") {
      console.warn(`[NOTIFICATION SERVICE] Invalid NOTIFICATION_PROVIDER '${providerMode}'. Falling back to DEVELOPMENT_CONSOLE_PROVIDER.`);
    }
    result = await sendConsoleNotification(params);
  }

  // Create Notification Audit Log entry in MongoDB if connected
  if (mongoose.connection.readyState === 1) {
    try {
      const incidentId = params.incident ? (params.incident._id || params.incident.id || "INC-N/A") : "N/A";
      const recipient = params.recipient || params.responder || {};
      const channel = providerMode.includes("twilio") ? (providerMode.includes("voice") ? "VOICE" : "SMS") : "CONSOLE";

      let logStatus = "DISPATCHED";
      if (result.provider === "DEVELOPMENT_CONSOLE_PROVIDER") {
        logStatus = "SIMULATED";
      } else if (result.success === false) {
        logStatus = "FAILED";
      } else if (result.success === true) {
        logStatus = "DELIVERED";
      }

      await NotificationLog.create({
        incidentId: String(incidentId),
        recipientUserId: recipient.id || recipient.userId || "N/A",
        recipientName: recipient.name || "Guardian / Responder",
        recipientPhone: recipient.phone || "N/A",
        recipientType: params.escalationTier || "PRIMARY",
        channel,
        notificationType: "EMERGENCY_ALERT",
        escalationTier: params.escalationTier || "PRIMARY",
        sentAt: new Date(),
        provider: result.provider || "DEVELOPMENT_CONSOLE_PROVIDER",
        status: logStatus,
        providerMessageId: result.callSid || result.messageId || null,
        failureReason: result.error || null
      });
    } catch (logErr) {
      console.error("[NOTIFICATION SERVICE] Failed to record NotificationLog in DB:", logErr.message);
    }
  }

  return result;
}

function sendDemoNotification(params) {
  return sendNotification(params);
}

module.exports = {
  sendNotification,
  sendDemoNotification
};