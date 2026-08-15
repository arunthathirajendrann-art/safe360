/**
 * SAFE360 PHASE 5 — MISSED CHECK-IN SAFETY SERVICE
 * Manages user scheduled safety check-ins, tracks deadlines,
 * and enforces strict duplicate-protected missed check-in incident creation.
 */

const mongoose = require("mongoose");
const CheckInSession = require("../../models/CheckInSession");

// In-memory cache for fast lookups & offline test environments
const checkInSessions = new Map();

async function scheduleCheckIn({ userId, intervalMinutes = 30, isSimulated = false, location = null }) {
  const now = new Date();
  const scheduledTime = now;
  const reminderTime = new Date(now.getTime() + Math.max(1, intervalMinutes - 5) * 60 * 1000);
  const deadline = new Date(now.getTime() + intervalMinutes * 60 * 1000);
  const checkInId = `CHK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const sessionData = {
    checkInId,
    userId: userId || "USR-GUEST",
    intervalMinutes,
    scheduledTime,
    reminderTime,
    deadline,
    status: "SCHEDULED",
    createdAt: now,
    lastCheckInAt: null,
    isSimulated: Boolean(isSimulated),
    incidentCreated: false,
    incidentId: null,
    location: location || { latitude: 0, longitude: 0 }
  };

  checkInSessions.set(sessionData.userId, sessionData);

  if (mongoose.connection.readyState === 1) {
    try {
      const doc = await CheckInSession.create(sessionData);
      return doc.toObject();
    } catch (_) {}
  }
  return sessionData;
}

async function respondToCheckIn(userId, checkInId = null) {
  const targetUserId = userId || "USR-GUEST";
  const now = new Date();

  // Check in-memory map
  const memSession = checkInSessions.get(targetUserId);
  if (memSession && memSession.status === "SCHEDULED") {
    memSession.status = "CHECKED_IN";
    memSession.lastCheckInAt = now;
    checkInSessions.set(targetUserId, memSession);
  }

  // Update DB document if connected
  if (mongoose.connection.readyState === 1) {
    try {
      const filter = checkInId
        ? { checkInId, userId: targetUserId }
        : { userId: targetUserId, status: { $in: ["SCHEDULED", "REMINDER_SENT"] } };

      const doc = await CheckInSession.findOneAndUpdate(
        filter,
        { $set: { status: "CHECKED_IN", lastCheckInAt: now } },
        { returnDocument: "after", sort: { createdAt: -1 } }
      );

      if (doc) {
        return {
          success: true,
          message: "Safety check-in recorded.",
          session: doc.toObject()
        };
      }
    } catch (_) {}
  }

  if (memSession) {
    return {
      success: true,
      message: "Safety check-in recorded.",
      session: memSession
    };
  }

  return {
    success: false,
    message: "No active safety check-in session found to complete."
  };
}

async function cancelCheckIn(userId, checkInId = null) {
  const targetUserId = userId || "USR-GUEST";

  const memSession = checkInSessions.get(targetUserId);
  if (memSession) {
    memSession.status = "CANCELLED";
    checkInSessions.delete(targetUserId);
  }

  if (mongoose.connection.readyState === 1) {
    try {
      const filter = checkInId
        ? { checkInId, userId: targetUserId }
        : { userId: targetUserId, status: { $in: ["SCHEDULED", "REMINDER_SENT"] } };

      await CheckInSession.updateMany(filter, { $set: { status: "CANCELLED" } });
    } catch (_) {}
  }

  return { success: true, message: "Safety check-in cancelled." };
}

async function getCheckInStatus(userId) {
  const targetUserId = userId || "USR-GUEST";
  const now = new Date();

  if (mongoose.connection.readyState === 1) {
    try {
      const doc = await CheckInSession.findOne({
        userId: targetUserId,
        status: { $in: ["SCHEDULED", "REMINDER_SENT"] }
      }).sort({ createdAt: -1 });

      if (doc) {
        const session = doc.toObject();
        const isOverdue = now > new Date(session.deadline);
        return {
          hasActiveCheckIn: true,
          isOverdue,
          session
        };
      }
    } catch (_) {}
  }

  const memSession = checkInSessions.get(targetUserId);
  if (memSession && ["SCHEDULED", "REMINDER_SENT"].includes(memSession.status)) {
    const isOverdue = now > new Date(memSession.deadline);
    return {
      hasActiveCheckIn: true,
      isOverdue,
      session: memSession
    };
  }

  return {
    hasActiveCheckIn: false,
    session: null
  };
}

/**
 * PROCESS EXPIRED CHECK-IN SESSIONS WITH ATOMIC DUPLICATE PROTECTION
 * Ensures exactly ONE incident and ONE escalation sequence is created per expired check-in.
 */
async function processExpiredCheckIns(incidentControllerRef = null) {
  const now = new Date();
  const createdIncidents = [];
  const processedSessionIds = new Set();

  // 1. Process DB sessions if connected
  if (mongoose.connection.readyState === 1) {
    try {
      const expiredDocs = await CheckInSession.find({
        deadline: { $lte: now },
        status: { $in: ["SCHEDULED", "REMINDER_SENT"] },
        incidentCreated: { $ne: true }
      });

      for (const doc of expiredDocs) {
        // Atomic Lock Check: Ensure no other thread processes this doc
        const lockedDoc = await CheckInSession.findOneAndUpdate(
          { _id: doc._id, incidentCreated: { $ne: true } },
          { $set: { status: "MISSED", incidentCreated: true } },
          { returnDocument: "after" }
        );

        if (!lockedDoc) continue; // Duplicate protection: Already processed!
        processedSessionIds.add(lockedDoc.userId);

        const missedDurationSeconds = Math.max(0, Math.round((now - new Date(lockedDoc.deadline)) / 1000));
        const checkInEvidence = {
          checkInId: lockedDoc.checkInId,
          scheduledTime: new Date(lockedDoc.scheduledTime).toISOString(),
          deadline: new Date(lockedDoc.deadline).toISOString(),
          missedDurationSeconds,
          lastCheckInAt: lockedDoc.lastCheckInAt ? new Date(lockedDoc.lastCheckInAt).toISOString() : null
        };

        const payload = {
          type: "MISSED_CHECKIN",
          source: "MISSED_CHECKIN",
          userId: lockedDoc.userId,
          context: "Protected person did not complete the scheduled safety check-in before the deadline.",
          isSimulated: Boolean(lockedDoc.isSimulated),
          location: lockedDoc.location || { latitude: 0, longitude: 0 },
          detectionEvidence: {
            source: "MISSED_CHECKIN",
            trigger: "CHECK_IN_TIMEOUT",
            checkInId: lockedDoc.checkInId,
            isSimulated: Boolean(lockedDoc.isSimulated)
          },
          checkInEvidence
        };

        if (incidentControllerRef && typeof incidentControllerRef.createIncidentCore === "function") {
          const incident = await incidentControllerRef.createIncidentCore(payload);
          lockedDoc.incidentId = incident._id || incident.id;
          await lockedDoc.save();
          createdIncidents.push(incident);
        } else {
          const { createIncidentCore } = require("../../controllers/incidentController");
          const incident = await createIncidentCore(payload);
          lockedDoc.incidentId = incident._id || incident.id;
          await lockedDoc.save();
          createdIncidents.push(incident);
        }
      }
    } catch (_) {}
  }

  // 2. Process in-memory sessions for offline/test environments
  for (const [uId, session] of checkInSessions.entries()) {
    if (processedSessionIds.has(uId)) continue;
    if (["SCHEDULED", "REMINDER_SENT"].includes(session.status) && now > new Date(session.deadline) && !session.incidentCreated) {
      // Atomic lock on memory session
      session.status = "MISSED";
      session.incidentCreated = true;

      const missedDurationSeconds = Math.max(0, Math.round((now - new Date(session.deadline)) / 1000));
      const checkInEvidence = {
        checkInId: session.checkInId,
        scheduledTime: new Date(session.scheduledTime).toISOString(),
        deadline: new Date(session.deadline).toISOString(),
        missedDurationSeconds,
        lastCheckInAt: session.lastCheckInAt ? new Date(session.lastCheckInAt).toISOString() : null
      };

      const payload = {
        type: "MISSED_CHECKIN",
        source: "MISSED_CHECKIN",
        userId: session.userId,
        context: "Protected person did not complete the scheduled safety check-in before the deadline.",
        isSimulated: Boolean(session.isSimulated),
        location: session.location || { latitude: 0, longitude: 0 },
        detectionEvidence: {
          source: "MISSED_CHECKIN",
          trigger: "CHECK_IN_TIMEOUT",
          checkInId: session.checkInId,
          isSimulated: Boolean(session.isSimulated)
        },
        checkInEvidence
      };

      try {
        const { createIncidentCore } = require("../../controllers/incidentController");
        const incident = await createIncidentCore(payload);
        session.incidentId = incident._id || incident.id;
        createdIncidents.push(incident);
      } catch (_) {}
    }
  }

  return createdIncidents;
}

let workerIntervalId = null;
function startCheckInWorker(intervalMs = 5000) {
  if (workerIntervalId) return;
  workerIntervalId = setInterval(() => {
    processExpiredCheckIns().catch(() => {});
  }, intervalMs);
}

module.exports = {
  scheduleCheckIn,
  respondToCheckIn,
  cancelCheckIn,
  getCheckInStatus,
  processExpiredCheckIns,
  startCheckInWorker,
  checkInSessions
};
