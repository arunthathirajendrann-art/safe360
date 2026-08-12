const mongoose = require("mongoose");
const Incident = require("../models/Incident");

const {
  canTransition
} = require("../services/incidentEngine/incidentEngine");

const {
  assessIncident
} = require("../services/incidentEngine/assessmentEngine");

const {
  escalateIncident,
  MOCK_RESPONDERS
} = require("../services/escalation/escalationEngine");

const {
  sendDemoNotification
} = require("../services/notification/notificationEngine");


// CREATE INCIDENT
const createIncident = async (req, res) => {
  try {
    const {
      type,
      userId,
      location,
      context,
      detectionEvidence
    } = req.body;

    const calculatedPriority = assessIncident({
      type,
      context,
      detectionEvidence
    });

    const incident = await Incident.create({
      type,
      userId,
      location,
      context,
      detectionEvidence,
      priority: calculatedPriority
    });

    res.status(201).json({
      success: true,
      message: "Incident created successfully",
      incident
    });

  } catch (error) {
    console.error("Create incident error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to create incident",
      error: error.message
    });
  }
};


// UPDATE INCIDENT STATUS
const updateIncidentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid incident ID"
      });
    }

    const incident = await Incident.findById(id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found"
      });
    }

    const allowed = canTransition(incident.status, status);

    if (!allowed) {
      return res.status(400).json({
        success: false,
        message: `Invalid transition: ${incident.status} → ${status}`
      });
    }

    // Demo escalation
    if (status === "ESCALATING") {
      const escalationResult = escalateIncident(incident);

      if (!escalationResult.success) {
        return res.status(503).json({
          success: false,
          message: "No demo responders available"
        });
      }

      incident.currentResponder = escalationResult.responder.id;

      // Demo notification
      sendDemoNotification({
        incident: {
          ...incident.toObject(),
          status: "RESPONDER_ASSIGNED"
        },
        responder: escalationResult.responder
      });
    }

    incident.status = status;

    await incident.save();

    res.json({
      success: true,
      message: "Incident status updated successfully",
      incident
    });

  } catch (error) {
    console.error("Update incident status error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to update incident status",
      error: error.message
    });
  }
};
const getIncidents = async (req, res) => {
  try {
    const incidents = await Incident.find()
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: incidents.length,
      incidents
    });

  } catch (error) {
    console.error("Get incidents error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to get incidents",
      error: error.message
    });
  }
};

// GET SINGLE INCIDENT
const getIncident = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid incident ID"
      });
    }

    const incident = await Incident.findById(id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found"
      });
    }

    res.json({
      success: true,
      incident
    });

  } catch (error) {
    console.error("Get incident error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to get incident",
      error: error.message
    });
  }
};


// GET RESPONDERS
const getResponders = async (req, res) => {
  try {
    res.json({
      success: true,
      responders: MOCK_RESPONDERS
    });

  } catch (error) {
    console.error("Get responders error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to get responders",
      error: error.message
    });
  }
};


// RESPONDER ACCEPTS INCIDENT
const respondToIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { responderId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid incident ID"
      });
    }

    const incident = await Incident.findById(id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found"
      });
    }

    if (incident.status !== "ESCALATING") {
      return res.status(400).json({
        success: false,
        message: `Responder cannot accept incident in ${incident.status} status`
      });
    }

    if (incident.currentResponder !== responderId) {
      return res.status(400).json({
        success: false,
        message: "Responder is not assigned to this incident"
      });
    }

    const allowed = canTransition(
      incident.status,
      "RESPONDER_ASSIGNED"
    );

    if (!allowed) {
      return res.status(400).json({
        success: false,
        message: "Invalid responder assignment transition"
      });
    }

    incident.status = "RESPONDER_ASSIGNED";

    await incident.save();

    res.json({
      success: true,
      message: "Responder accepted incident",
      incident
    });

  } catch (error) {
    console.error("Responder action error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to process responder action",
      error: error.message
    });
  }
};


module.exports = {
  createIncident,
  updateIncidentStatus,
  getIncidents,
  getIncident,
  getResponders,
  respondToIncident
};