const express = require("express");

const {
  createIncident,
  updateIncidentStatus,
  getIncidents,
  getIncident,
  getIncidentEscalation,
  acknowledgeIncidentEscalation,
  cancelIncident,
  getResponders,
  respondToIncident
} = require("../controllers/incidentController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", createIncident);
router.get("/", getIncidents);
router.get("/responders", getResponders);
router.get("/:id", getIncident);
router.get("/:id/escalation", getIncidentEscalation);
router.post("/:id/acknowledge", authMiddleware, acknowledgeIncidentEscalation);
router.post("/:id/cancel", authMiddleware, cancelIncident);
router.patch("/:id/status", updateIncidentStatus);
router.post("/:id/respond", respondToIncident);

module.exports = router;