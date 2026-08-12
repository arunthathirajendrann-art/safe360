const mongoose = require("mongoose");

const incidentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["SOS", "FALL", "VOICE"],
      required: true
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
        "RESPONDER_ASSIGNED",
        "HELP_EN_ROUTE",
        "RESOLVED"
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

    currentResponder: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Incident", incidentSchema);