const mongoose = require("mongoose");

const CheckInSessionSchema = new mongoose.Schema(
  {
    checkInId: {
      type: String,
      required: true,
      unique: true
    },
    userId: {
      type: String,
      required: true,
      index: true
    },
    intervalMinutes: {
      type: Number,
      default: 30
    },
    scheduledTime: {
      type: Date,
      required: true
    },
    reminderTime: {
      type: Date
    },
    deadline: {
      type: Date,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ["SCHEDULED", "REMINDER_SENT", "CHECKED_IN", "MISSED", "CANCELLED"],
      default: "SCHEDULED"
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastCheckInAt: {
      type: Date,
      default: null
    },
    isSimulated: {
      type: Boolean,
      default: false
    },
    incidentCreated: {
      type: Boolean,
      default: false,
      index: true
    },
    incidentId: {
      type: String,
      default: null
    },
    location: {
      latitude: Number,
      longitude: Number
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("CheckInSession", CheckInSessionSchema);
