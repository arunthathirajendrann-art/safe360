const mongoose = require("mongoose");

const emergencyContactSchema = new mongoose.Schema(
  {
    contactId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    ownerUserId: {
      type: String,
      required: true,
      index: true
    },
    guardianUserId: {
      type: String,
      default: null,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      default: "",
      trim: true
    },
    relationship: {
      type: String,
      default: "Emergency Contact"
    },
    tier: {
      type: String,
      enum: ["PRIMARY", "SECONDARY", "TERTIARY"],
      default: "PRIMARY"
    },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "DECLINED", "REVOKED", "EXPIRED"],
      default: "PENDING"
    },
    invitationToken: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    connectionCode: {
      type: String,
      default: null,
      index: true
    },
    codeExpiresAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmergencyContact", emergencyContactSchema);
