/**
 * SAFE360 PHASE 5 — MISSED CHECK-IN SAFETY SERVICE
 * Manages user scheduled safety check-ins and tracks pending deadlines.
 */

const checkInSessions = new Map();

function scheduleCheckIn({ userId, intervalMinutes = 30 }) {
  const now = new Date();
  const scheduledTime = now;
  const reminderTime = new Date(now.getTime() + (intervalMinutes - 5) * 60 * 1000);
  const deadline = new Date(now.getTime() + intervalMinutes * 60 * 1000);

  const session = {
    checkInId: `CHK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId,
    intervalMinutes,
    scheduledTime,
    reminderTime,
    deadline,
    status: "ACTIVE", // ACTIVE, COMPLETED, EXPIRED
    createdAt: now
  };

  checkInSessions.set(userId, session);
  return session;
}

function respondToCheckIn(userId) {
  const session = checkInSessions.get(userId);
  if (!session) return { success: false, message: "No active check-in session found." };

  session.status = "COMPLETED";
  session.completedAt = new Date();
  checkInSessions.delete(userId);

  return {
    success: true,
    message: "Check-in completed successfully. Safety status active.",
    session
  };
}

function getCheckInStatus(userId) {
  const session = checkInSessions.get(userId);
  if (!session) {
    return { hasActiveCheckIn: false, session: null };
  }

  const now = new Date();
  const isOverdue = now > session.deadline;

  return {
    hasActiveCheckIn: true,
    isOverdue,
    session
  };
}

module.exports = {
  scheduleCheckIn,
  respondToCheckIn,
  getCheckInStatus,
  checkInSessions
};
