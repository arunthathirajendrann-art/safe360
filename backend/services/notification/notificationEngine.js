const sendDemoNotification = ({
  incident,
  responder
}) => {
  console.log("\n==============================");
  console.log("SAFE360 DEMO NOTIFICATION");
  console.log("==============================");

  console.log(`Incident Type : ${incident.type}`);
  console.log(`Priority      : ${incident.priority}`);
  console.log(`Status        : ${incident.status}`);
  console.log(`Responder     : ${responder.name}`);
  console.log(`Responder ID  : ${responder.id}`);

  console.log("==============================");
  console.log("Demo notification sent successfully.");
  console.log("==============================\n");

  return {
    success: true,
    mode: "DEMO",
    message: "Demo notification sent successfully",
    recipient: responder.id
  };
};

module.exports = {
  sendDemoNotification
};