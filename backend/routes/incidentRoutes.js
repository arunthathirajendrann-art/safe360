const express = require("express");

const {
  createIncident,
  updateIncidentStatus,
  getIncidents,
  getIncident,
  getIncidentEscalation,
  acknowledgeIncidentEscalation,
  getResponders,
  respondToIncident
} = require("../controllers/incidentController");

const router = express.Router();

router.post("/", createIncident);

router.get("/", getIncidents);

router.get("/responders", getResponders);

router.get("/:id", getIncident);

router.get("/:id/escalation", getIncidentEscalation);

router.post("/:id/acknowledge", acknowledgeIncidentEscalation);

router.patch("/:id/status", updateIncidentStatus);

router.post("/:id/respond", respondToIncident);

module.exports = router;