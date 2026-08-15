const express = require("express");
const {
  generateConnectionCode,
  connectWithCode,
  addContact,
  getContacts,
  deleteContact,
  acceptInvitation,
  getConnectedPeople,
  getConnectedIncidents
} = require("../controllers/contactController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { addGuardianConnection, removeGuardianConnection } = require("../services/realtime/sseService");

const { scheduleCheckIn, respondToCheckIn, getCheckInStatus } = require("../services/checkin/checkInService");

const router = express.Router();

router.use(authMiddleware);

router.post("/generate-code", generateConnectionCode);
router.post("/connect-code", connectWithCode);
router.post("/", addContact);
router.get("/", getContacts);
router.delete("/:id", deleteContact);
router.post("/accept-invite", acceptInvitation);
router.get("/guardians/people", getConnectedPeople);
router.get("/guardians/incidents", getConnectedIncidents);

// Phase 5 Safety Check-in Routes
router.post("/checkin/schedule", async (req, res) => {
  const { intervalMinutes, isSimulated, latitude, longitude } = req.body;
  const session = await scheduleCheckIn({
    userId: req.user ? req.user.userId : "USR-GUEST",
    intervalMinutes: intervalMinutes || 30,
    isSimulated: Boolean(isSimulated),
    location: (latitude && longitude) ? { latitude, longitude } : null
  });
  res.json({ success: true, message: `Safety check-in scheduled for ${session.intervalMinutes} minutes`, session });
});

router.post("/checkin/respond", async (req, res) => {
  const userId = req.user ? req.user.userId : "USR-GUEST";
  const { checkInId } = req.body;
  const result = await respondToCheckIn(userId, checkInId);
  res.json(result);
});

router.post("/checkin/cancel", async (req, res) => {
  const userId = req.user ? req.user.userId : "USR-GUEST";
  const { checkInId } = req.body;
  const result = await cancelCheckIn(userId, checkInId);
  res.json(result);
});

router.get("/checkin/status", async (req, res) => {
  const userId = req.user ? req.user.userId : "USR-GUEST";
  const status = await getCheckInStatus(userId);
  res.json({ success: true, ...status });
});

router.post("/checkin/process-expired", async (req, res) => {
  const createdIncidents = await processExpiredCheckIns();
  res.json({ success: true, processedCount: createdIncidents.length, incidents: createdIncidents });
});

// Real-Time SSE Stream Endpoint for Guardians
router.get("/guardians/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const guardianUserId = req.user ? req.user.userId : null;
  if (guardianUserId) {
    addGuardianConnection(guardianUserId, res);
    req.on("close", () => {
      removeGuardianConnection(guardianUserId, res);
    });
  } else {
    res.write(`data: ${JSON.stringify({ type: "ERROR", message: "Unauthorized stream connection" })}\n\n`);
    res.end();
  }
});

module.exports = router;
