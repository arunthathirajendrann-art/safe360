function sendConsoleNotification({ incident, recipient, responder, escalationTier, reason }) {
  const contactObj = recipient || responder;
  const contactName = contactObj ? (contactObj.name || contactObj.id || contactObj) : "Dispatch Team";
  const contactPhone = contactObj ? (contactObj.phone || "N/A") : "N/A";
  const incidentId = incident._id || incident.id || "INCIDENT";
  const tierLabel = escalationTier || "PRIMARY";

  console.log("\n==========================================");
  console.log("[NOTIFICATION SERVICE] Dispatch Signal Emitted");
  console.log("==========================================");
  console.log(`Incident ID     : ${incidentId}`);
  console.log(`Incident Type   : ${incident.type}`);
  console.log(`Priority        : ${incident.priority}`);
  console.log(`Escalation Tier : ${tierLabel}`);
  console.log(`Recipient Name  : ${contactName}`);
  console.log(`Recipient Phone : ${contactPhone}`);
  console.log(`Reason          : ${reason || "Emergency Escalation Triggered"}`);
  console.log(`Provider Mode   : DEVELOPMENT_CONSOLE_PROVIDER`);
  console.log("==========================================\n");

  return {
    success: true,
    provider: "DEVELOPMENT_CONSOLE_PROVIDER",
    message: `Escalation alert delivered to console logger for ${contactName} (${tierLabel})`,
    recipient: contactName,
    phone: contactPhone,
    escalationTier: tierLabel,
    reason: reason || "Emergency Escalation Triggered",
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  sendConsoleNotification
};
