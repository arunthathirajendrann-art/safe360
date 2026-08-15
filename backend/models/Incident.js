const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    channel: { type: String, default: "DEVELOPMENT_CONSOLE_PROVIDER" }
  },
  { _id: false }
);

const escalationHistorySchema = new mongoose.Schema(
  {
    tier: {
      type: String,
      enum: ["PRIMARY", "SECONDARY", "TERTIARY", "RESPONDER_FLEET", "NONE"],
      required: true
    },
    contactName: { type: String, default: "N/A" },
    contactPhone: { type: String, default: "N/A" },
    action: {
      type: String,
      enum: [
        "INITIATED",
        "CONTACT_ATTEMPTED",
        "CALL_ATTEMPTED",
        "CALL_DISPATCHED",
        "CALL_FAILED",
        "ACKNOWLEDGED",
        "TIMEOUT_EXCEEDED",
        "ESCALATED_NEXT_TIER",
        "DISPATCHED_RESPONDER",
        "COMPLETED",
        "CANCELLED"
      ],
      required: true
    },
    reason: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);

const incidentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "SOS",
        "MANUAL_SOS",
        "FALL",
        "FALL_DETECTION",
        "VOICE",
        "VOICE_SOS",
        "STEALTH_SOS",
        "ROUTE_DEVIATION",
        "MISSED_CHECKIN"
      ],
      required: true
    },

    source: {
      type: String,
      enum: ["MANUAL_SOS", "STEALTH_SOS", "VOICE_SOS", "FALL_DETECTION", "ROUTE_DEVIATION", "MISSED_CHECKIN"],
      default: "MANUAL_SOS"
    },

    userId: {
      type: String,
      required: true
    },

    status: {
      type: String,
      enum: [
        "DETECTED",
        "UNDERSTOOD",
        "ASSESSED",
        "ESCALATING",
        "ACKNOWLEDGED",
        "RESPONDER_ASSIGNED",
        "HELP_EN_ROUTE",
        "RESOLVED",
        "CANCELLED"
      ],
      default: "DETECTED"
    },

    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "HIGH"
    },

    location: {
      latitude: Number,
      longitude: Number
    },

    context: {
      type: String,
      default: ""
    },

    detectionEvidence: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    // PHASE 5 SAFETY INTELLIGENCE & EXPLAINABILITY EXTENSIONS
    confidence: {
      type: Number,
      default: 85
    },

    isSimulated: {
      type: Boolean,
      default: false
    },

    assessmentReason: {
      type: String,
      default: ""
    },

    riskFactors: {
      type: [String],
      default: []
    },

    sensorEvidence: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },

    locationEvidence: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },

    voiceEvidence: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },

    checkInEvidence: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },

    currentResponder: {
      type: String,
      default: null
    },

    cancelledAt: Date,
    cancelledByUserId: String,
    cancellationReason: String,

    // ADAPTIVE ESCALATION ENGINE EXTENSIONS
    escalationPolicy: {
      primaryContact: contactSchema,
      secondaryContact: contactSchema,
      tertiaryContact: contactSchema,
      responseTimeoutSeconds: { type: Number, default: 15 }
    },

    escalationState: {
      currentTier: {
        type: String,
        enum: ["NONE", "PRIMARY", "SECONDARY", "TERTIARY", "RESPONDER_FLEET", "COMPLETED"],
        default: "NONE"
      },
      status: {
        type: String,
        enum: ["PENDING", "CONTACTING", "ACKNOWLEDGED", "TIMEOUT", "ESCALATED", "COMPLETED", "CANCELLED"],
        default: "PENDING"
      },
      currentContact: contactSchema,
      contactedAt: Date,
      acknowledgedAt: Date,
      timeoutAt: Date,
      responseStatus: String,
      escalationReason: String
    },

    escalationHistory: {
      type: [escalationHistorySchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Incident", incidentSchema);