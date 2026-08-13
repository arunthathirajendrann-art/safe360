function sendNotification({ incident, responder }) {
  const recipient = responder ? (responder.name || responder.id || "Dispatch Team") : "All Responders";
  const incidentId = incident._id || incident.id || "INCIDENT";

  console.log("\n==========================================");
  console.log("[NOTIFICATION SERVICE] Dispatch Signal Emitted");
  console.log("==========================================");
  console.log(`Incident ID   : ${incidentId}`);
  console.log(`Incident Type : ${incident.type}`);
  console.log(`Priority      : ${incident.priority}`);
  console.log(`Status        : ${incident.status}`);
  console.log(`Recipient     : ${recipient}`);
  console.log(`Provider Mode : DEVELOPMENT_CONSOLE_PROVIDER`);
  console.log("==========================================\n");

  return {
    success: true,
    provider: "DEVELOPMENT_CONSOLE_PROVIDER",
    message: `Dispatch alert delivered to console logger for ${recipient}`,
    recipient,
    timestamp: new Date().toISOString()
  };
}

function sendDemoNotification({ incident, responder }) {
  return sendNotification({ incident, responder });
}

module.exports = {
  sendNotification,
  sendDemoNotification
};