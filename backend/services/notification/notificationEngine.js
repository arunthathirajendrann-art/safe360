const { sendConsoleNotification } = require("./providers/consoleProvider");
const { sendTwilioNotification } = require("./providers/twilioProvider");
const { sendTwilioVoiceNotification } = require("./providers/twilioVoiceProvider");

async function sendNotification(params = {}) {
  const providerMode = (process.env.NOTIFICATION_PROVIDER || process.env.VOICE_NOTIFICATION_PROVIDER || "console").toLowerCase().trim();

  if (providerMode === "twilio_voice") {
    return sendTwilioVoiceNotification(params);
  }

  if (providerMode === "twilio" || providerMode === "twilio_sms") {
    return sendTwilioNotification(params);
  }

  if (providerMode === "console") {
    return sendConsoleNotification(params);
  }

  // Handle invalid/unrecognized provider mode gracefully
  console.warn(`[NOTIFICATION SERVICE] Invalid NOTIFICATION_PROVIDER '${providerMode}'. Falling back to DEVELOPMENT_CONSOLE_PROVIDER.`);
  const fallbackResult = sendConsoleNotification(params);
  return {
    ...fallbackResult,
    providerWarning: `Unrecognized NOTIFICATION_PROVIDER mode '${providerMode}', used console fallback.`
  };
}

function sendDemoNotification(params) {
  return sendNotification(params);
}

module.exports = {
  sendNotification,
  sendDemoNotification
};