const express = require("express");

const {
  createIncident,
  updateIncidentStatus,
  getIncident,
  getResponders,
  respondToIncident
} = require("../controllers/incidentController");

const router = express.Router();

router.post("/", createIncident);

router.get("/responders", getResponders);

router.get("/:id", getIncident);

router.patch("/:id/status", updateIncidentStatus);
router.post("/:id/respond", respondToIncident);
module.exports = router;