const mongoose = require("mongoose");
const EmergencyContact = require("../../models/EmergencyContact");

// Store active guardian SSE connections: Map<guardianUserId, Set<res>>
const guardianConnections = new Map();

function addGuardianConnection(guardianUserId, res) {
  if (!guardianConnections.has(guardianUserId)) {
    guardianConnections.set(guardianUserId, new Set());
  }
  guardianConnections.get(guardianUserId).add(res);

  // Send initial ping connection established event
  res.write(`data: ${JSON.stringify({ type: "CONNECTED", message: "Real-time SSE stream connected" })}\n\n`);
}

function removeGuardianConnection(guardianUserId, res) {
  if (guardianConnections.has(guardianUserId)) {
    const clientSet = guardianConnections.get(guardianUserId);
    clientSet.delete(res);
    if (clientSet.size === 0) {
      guardianConnections.delete(guardianUserId);
    }
  }
}

/**
 * Broadcasts an event strictly to authorized Guardians connected to protectedUserId in MongoDB.
 */
async function broadcastToConnectedGuardians(protectedUserId, eventType, data = {}) {
  try {
    if (!protectedUserId) return;

    let guardianUserIds = [];
    if (mongoose.connection.readyState === 1) {
      const contacts = await EmergencyContact.find({
        ownerUserId: protectedUserId,
        status: "ACCEPTED"
      });

      guardianUserIds = contacts
        .map(c => c.guardianUserId)
        .filter(id => id && typeof id === "string");
    }

    if (guardianUserIds.length === 0) return;

    const payload = JSON.stringify({
      type: eventType,
      protectedUserId,
      timestamp: new Date().toISOString(),
      ...data
    });

    for (const guardianId of guardianUserIds) {
      if (guardianConnections.has(guardianId)) {
        const clientSet = guardianConnections.get(guardianId);
        for (const res of clientSet) {
          res.write(`data: ${payload}\n\n`);
        }
      }
    }
  } catch (err) {
    console.error("[SSE Service] Broadcast error:", err.message);
  }
}

module.exports = {
  addGuardianConnection,
  removeGuardianConnection,
  broadcastToConnectedGuardians
};
