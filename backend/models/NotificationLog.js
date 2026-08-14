const mongoose = require("mongoose");

const notificationLogSchema = new mongoose.Schema(
  {
    incidentId: {
      type: String,
      required: true,
      index: true
    },
    recipientUserId: {
      type: String,
      default: "N/A"
    },
    recipientName: {
      type: String,
      required: true
    },
    recipientPhone: {
      type: String,
      default: "N/A"
    },
    recipientType: {
      type: String,
      default: "PRIMARY"
    },
    channel: {
      type: String,
      enum: ["PUSH", "SMS", "VOICE", "CONSOLE"],
      default: "CONSOLE"
    },
    notificationType: {
      type: String,
      enum: ["EMERGENCY_ALERT", "STATUS_UPDATE", "ESCALATION_NOTICE"],
      default: "EMERGENCY_ALERT"
    },
    escalationTier: {
      type: String,
      default: "PRIMARY"
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    provider: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ["DISPATCHED", "DELIVERED", "FAILED", "SIMULATED"],
      default: "DISPATCHED"
    },
    providerMessageId: {
      type: String,
      default: null
    },
    failureReason: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("NotificationLog", notificationLogSchema);
