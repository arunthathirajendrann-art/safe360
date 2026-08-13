const mongoose = require("mongoose");
const Incident = require("../models/Incident");

const { canTransition } = require("../services/incidentEngine/incidentEngine");
const { analyzeIncident } = require("../services/llm/llmService");
const {
  getResponders: getRespondersService,
  escalateIncident,
  assignResponder,
  MOCK_RESPONDERS
} = require("../services/escalation/escalationEngine");
const { sendNotification } = require("../services/notification/notificationEngine");

// CREATE & AUTOMATICALLY ORCHESTRATE INCIDENT
const createIncident = async (req, res) => {
  try {
    const { type, userId, location, context, detectionEvidence } = req.body;

    const validatedType = ["SOS", "FALL", "VOICE"].includes(type) ? type : "SOS";

    // 1. Initial record creation in DETECTED state
    const incident = await Incident.create({
      type: validatedType,
      userId: userId || "USR-UNKNOWN",
      location: location || {},
      context: context || "",
      detectionEvidence: detectionEvidence || {},
      status: "DETECTED",
      priority: "HIGH"
    });

    // 2. LLM Analysis via Google Gemini API
    const llmAssessment = await analyzeIncident({
      type: incident.type,
      context: incident.context,
      detectionEvidence: incident.detectionEvidence
    });

    // Merge LLM assessment into evidence for auditability
    const existingEvidence = typeof incident.detectionEvidence === "object" ? incident.detectionEvidence : {};
    incident.detectionEvidence = {
      ...existingEvidence,
      llmAssessment: {
        incidentType: llmAssessment.incidentType,
        summary: llmAssessment.summary,
        priority: llmAssessment.priority,
        requiresImmediateResponse: llmAssessment.requiresImmediateResponse,
        isFallback: llmAssessment.isFallback
      }
    };

    if (!incident.context && llmAssessment.summary) {
      incident.context = llmAssessment.summary;
    }

    // 3. Automatic transition: DETECTED -> UNDERSTOOD
    if (canTransition(incident.status, "UNDERSTOOD")) {
      incident.status = "UNDERSTOOD";
    }

    // 4. Automatic transition: UNDERSTOOD -> ASSESSED
    if (canTransition(incident.status, "ASSESSED")) {
      incident.status = "ASSESSED";
      incident.priority = llmAssessment.priority || "HIGH";
    }

    // 5. Automatic Escalation & Responder Assignment if high urgency
    let assignedResponder = null;
    let notificationResult = null;

    if (
      llmAssessment.requiresImmediateResponse ||
      incident.priority === "HIGH" ||
      incident.priority === "CRITICAL"
    ) {
      if (canTransition(incident.status, "ESCALATING")) {
        incident.status = "ESCALATING";

        const escalationResult = escalateIncident(incident);
        if (escalationResult.success && escalationResult.responder) {
          assignedResponder = escalationResult.responder;
          incident.currentResponder = assignedResponder.id;

          if (canTransition(incident.status, "RESPONDER_ASSIGNED")) {
            incident.status = "RESPONDER_ASSIGNED";
          }

          notificationResult = sendNotification({
            incident,
            responder: assignedResponder
          });
        }
      }
    }

    await incident.save();

    res.status(201).json({
      success: true,
      message: `Incident created and automatically processed to ${incident.status}`,
      incident,
      assessment: llmAssessment,
      responder: assignedResponder,
      notification: notificationResult
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

// UPDATE INCIDENT STATUS (Controlled Admin / Manual Transition)
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

    let assignedResponder = null;
    let notificationResult = null;

    // Trigger escalation if transitioning to ESCALATING
    if (status === "ESCALATING") {
      const escalationResult = escalateIncident(incident);

      if (!escalationResult.success) {
        return res.status(503).json({
          success: false,
          message: escalationResult.message || "No responders available"
        });
      }

      assignedResponder = escalationResult.responder;
      incident.currentResponder = assignedResponder.id;

      notificationResult = sendNotification({
        incident: {
          ...incident.toObject(),
          status: "RESPONDER_ASSIGNED"
        },
        responder: assignedResponder
      });
    }

    incident.status = status;
    await incident.save();

    res.json({
      success: true,
      message: `Incident status updated to ${status}`,
      incident,
      responder: assignedResponder,
      notification: notificationResult
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

// GET ALL INCIDENTS
const getIncidents = async (req, res) => {
  try {
    const incidents = await Incident.find().sort({ createdAt: -1 });

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

// GET RESPONDERS CONTROLLER
const getResponders = async (req, res) => {
  try {
    const respondersList = getRespondersService();

    res.json({
      success: true,
      responders: respondersList
    });

  } catch (error) {
    console.error("Get responders error:", error.message);
    res.json({
      success: true,
      responders: MOCK_RESPONDERS
    });
  }
};

// RESPONDER ACCEPTS / RESPONDS TO INCIDENT
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

    if (incident.status !== "ESCALATING" && incident.status !== "RESPONDER_ASSIGNED") {
      return res.status(400).json({
        success: false,
        message: `Responder cannot accept incident in ${incident.status} status`
      });
    }

    if (incident.currentResponder && incident.currentResponder !== responderId) {
      return res.status(400).json({
        success: false,
        message: "Responder is not assigned to this incident"
      });
    }

    const assignResult = assignResponder(responderId);
    if (!assignResult.success && assignResult.message.includes("not found")) {
      return res.status(400).json({
        success: false,
        message: assignResult.message
      });
    }

    incident.currentResponder = responderId;
    if (incident.status === "ESCALATING") {
      if (canTransition(incident.status, "RESPONDER_ASSIGNED")) {
        incident.status = "RESPONDER_ASSIGNED";
      }
    }

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