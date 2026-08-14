const mongoose = require("mongoose");
const Incident = require("../models/Incident");
const EmergencyContact = require("../models/EmergencyContact");

const { canTransition } = require("../services/incidentEngine/incidentEngine");
const { evaluateSafetyRisk } = require("../services/incidentEngine/riskEngine");
const { analyzeIncident } = require("../services/llm/llmService");
const {
  getResponders: getRespondersService,
  escalateIncident,
  assignResponder,
  MOCK_RESPONDERS
} = require("../services/escalation/escalationEngine");
const {
  initializeEscalation,
  acknowledgeEscalation,
  advanceEscalation
} = require("../services/escalation/contactEscalationService");
const { sendNotification } = require("../services/notification/notificationEngine");
const { broadcastToConnectedGuardians } = require("../services/realtime/sseService");

// CREATE & AUTOMATICALLY ORCHESTRATE INCIDENT
const createIncident = async (req, res) => {
  try {
    const { type, userId, location, context, detectionEvidence, escalationPolicy } = req.body;

    const validTypes = ["SOS", "FALL", "VOICE", "STEALTH_SOS", "ROUTE_DEVIATION", "MISSED_CHECKIN"];
    const validatedType = validTypes.includes(type) ? type : "SOS";

    const sourceMap = {
      "SOS": "MANUAL_SOS",
      "MANUAL_SOS": "MANUAL_SOS",
      "STEALTH_SOS": "STEALTH_SOS",
      "VOICE": "VOICE_SOS",
      "VOICE_SOS": "VOICE_SOS",
      "FALL": "FALL_DETECTION",
      "FALL_DETECTION": "FALL_DETECTION",
      "ROUTE_DEVIATION": "ROUTE_DEVIATION",
      "MISSED_CHECKIN": "MISSED_CHECKIN"
    };
    const validatedSource = sourceMap[type] || req.body.source || "MANUAL_SOS";
    const targetUserId = userId || (req.user ? req.user.userId : "USR-UNKNOWN");

    // 0. Idempotency Check: Prevent duplicate SOS within 30 seconds for same user & source
    const thirtySecAgo = new Date(Date.now() - 30 * 1000);
    const existingActive = await Incident.findOne({
      userId: targetUserId,
      source: validatedSource,
      status: { $in: ["DETECTED", "UNDERSTOOD", "ASSESSED", "ESCALATING"] },
      createdAt: { $gte: thirtySecAgo }
    });

    if (existingActive) {
      return res.status(200).json({
        success: true,
        message: "Existing active emergency returned (duplicate protection applied)",
        incident: existingActive,
        isDuplicate: true
      });
    }

    // 1. Run Phase 5 Multi-Signal Safety Risk Fusion Assessment
    const riskAssessment = evaluateSafetyRisk({
      source: validatedSource,
      type: validatedType,
      context: context || "",
      detectionEvidence: detectionEvidence || {},
      sensorEvidence: req.body.sensorEvidence || null,
      locationEvidence: req.body.locationEvidence || null,
      voiceEvidence: req.body.voiceEvidence || null,
      checkInEvidence: req.body.checkInEvidence || null,
      isSimulated: req.body.isSimulated || false
    });

    // Initial record creation in DETECTED state
    const incident = await Incident.create({
      type: validatedType,
      source: validatedSource,
      userId: targetUserId,
      location: location || {},
      context: context || riskAssessment.assessmentReason,
      detectionEvidence: detectionEvidence || {},
      confidence: riskAssessment.confidence,
      isSimulated: Boolean(req.body.isSimulated),
      assessmentReason: riskAssessment.assessmentReason,
      riskFactors: riskAssessment.riskFactors,
      sensorEvidence: req.body.sensorEvidence || null,
      locationEvidence: req.body.locationEvidence || null,
      voiceEvidence: req.body.voiceEvidence || null,
      checkInEvidence: req.body.checkInEvidence || null,
      status: "DETECTED",
      priority: riskAssessment.priority || "HIGH",
      escalationPolicy: escalationPolicy || {}
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
      riskFusion: riskAssessment,
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
      incident.priority = riskAssessment.priority || llmAssessment.priority || "HIGH";
    }

    // 5. Initialize Adaptive Multi-Tier Escalation
    await initializeEscalation(incident, llmAssessment);

    if (
      llmAssessment.requiresImmediateResponse ||
      incident.priority === "HIGH" ||
      incident.priority === "CRITICAL"
    ) {
      if (canTransition(incident.status, "ESCALATING")) {
        incident.status = "ESCALATING";
      }
    }

    await incident.save();
    await broadcastToConnectedGuardians(targetUserId, "INCIDENT_CREATED", { incident });

    res.status(201).json({
      success: true,
      message: `Incident created and automatically processed to ${incident.status}`,
      incident,
      assessment: llmAssessment,
      escalationState: incident.escalationState,
      escalationHistory: incident.escalationHistory
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

      notificationResult = await sendNotification({
        incident: {
          ...incident.toObject(),
          status: "RESPONDER_ASSIGNED"
        },
        responder: assignedResponder
      });
    }

    if (status === "ACKNOWLEDGED") {
      const ackUser = req.user ? req.user.name : "Guardian";
      await acknowledgeEscalation(incident._id, "PRIMARY", ackUser);
    }

    incident.status = status;
    await incident.save();
    await broadcastToConnectedGuardians(incident.userId, "INCIDENT_UPDATE", { incident });

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

// GET INCIDENT ESCALATION DETAILS
const getIncidentEscalation = async (req, res) => {
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
      escalation: {
        policy: incident.escalationPolicy,
        state: incident.escalationState,
        history: incident.escalationHistory
      }
    });

  } catch (error) {
    console.error("Get escalation error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to get escalation details",
      error: error.message
    });
  }
};

// ACKNOWLEDGE INCIDENT ESCALATION (Strict Guardian Auth & Double-Ack Lock)
const acknowledgeIncidentEscalation = async (req, res) => {
  try {
    const { id } = req.params;
    const { tier, contactId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid incident ID"
      });
    }

    const targetInc = await Incident.findById(id);
    if (!targetInc) {
      return res.status(404).json({ success: false, message: "Incident not found" });
    }

    // 1. Simultaneous Acknowledgement Lock: Return 400 if already acknowledged
    if (targetInc.status === "ACKNOWLEDGED" || (targetInc.escalationState && targetInc.escalationState.status === "ACKNOWLEDGED")) {
      return res.status(400).json({
        success: false,
        message: "Incident already acknowledged by another guardian."
      });
    }

    // 2. Strict Backend Authorization Check: Guardian MUST be connected to protected user in DB
    if (req.user && req.user.userType === "CAREGIVER") {
      const isConnected = await EmergencyContact.findOne({
        ownerUserId: targetInc.userId,
        guardianUserId: req.user.userId,
        status: "ACCEPTED"
      });
      if (!isConnected) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You are not connected as a guardian for this protected person."
        });
      }
    }

    const ackName = req.user ? req.user.name : (contactId || "Guardian");
    const incident = await acknowledgeEscalation(id, tier, ackName);

    res.json({
      success: true,
      message: `Escalation acknowledged successfully by ${ackName}. Escalation sequence halted.`,
      incident
    });

  } catch (error) {
    console.error("Acknowledge escalation error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to acknowledge escalation",
      error: error.message
    });
  }
};

// CANCEL INCIDENT (Protected Person False SOS Cancellation)
const cancelIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid incident ID" });
    }

    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({ success: false, message: "Incident not found" });
    }

    // Only protected person or connected guardian can cancel
    if (req.user && req.user.userId !== incident.userId && req.user.userType !== "CAREGIVER") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only the protected person or connected guardian can cancel this emergency."
      });
    }

    const now = new Date();
    const cancelReason = reason || "False alarm cancelled by user";

    incident.status = "CANCELLED";
    incident.cancelledAt = now;
    incident.cancelledByUserId = req.user ? req.user.userId : incident.userId;
    incident.cancellationReason = cancelReason;

    incident.escalationState = {
      ...incident.escalationState,
      status: "CANCELLED",
      escalationReason: cancelReason
    };

    incident.escalationHistory.push({
      tier: incident.escalationState ? incident.escalationState.currentTier : "NONE",
      contactName: req.user ? req.user.name : "Protected User",
      contactPhone: "N/A",
      action: "CANCELLED",
      reason: cancelReason,
      timestamp: now
    });

    await incident.save();
    await broadcastToConnectedGuardians(incident.userId, "INCIDENT_UPDATE", { incident });

    res.json({
      success: true,
      message: "Incident cancelled successfully",
      incident
    });

  } catch (error) {
    console.error("Cancel incident error:", error.message);
    res.status(500).json({ success: false, message: "Failed to cancel incident", error: error.message });
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
    await broadcastToConnectedGuardians(incident.userId, "INCIDENT_UPDATE", { incident });

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
  getIncidentEscalation,
  acknowledgeIncidentEscalation,
  cancelIncident,
  getResponders,
  respondToIncident
};