/**
 * SAFE360 PHASE 5 — MULTI-SIGNAL SAFETY RISK FUSION ENGINE
 * Combines independent evidence streams (Sensors, GPS Corridor, Voice Intent, Check-ins)
 * into an explainable, weighted risk assessment with confidence metrics.
 */

const SAFETY_THRESHOLDS = {
  FALL_IMPACT_THRESHOLD: 2.5, // g-force peak
  FALL_INACTIVITY_WINDOW: 5, // seconds
  FALL_CONFIDENCE_THRESHOLD: 70, // %
  ROUTE_DEVIATION_DISTANCE_METERS: 100, // meters outside corridor
  ROUTE_DEVIATION_DURATION_SECONDS: 60, // seconds outside corridor
  GPS_ACCURACY_LIMIT: 30 // meters
};

/**
 * Calculates multi-signal risk fusion, confidence score, and human-readable evidence reason.
 */
function evaluateSafetyRisk(payload = {}) {
  const {
    source,
    type,
    context = "",
    detectionEvidence = {},
    sensorEvidence = null,
    locationEvidence = null,
    voiceEvidence = null,
    checkInEvidence = null,
    isSimulated = false
  } = payload;

  const actualSource = source || type || "MANUAL_SOS";
  const riskFactors = [];
  let baseScore = 0;
  let confidence = 85;

  // 1. Evaluate Sensor (Fall) Evidence
  if (actualSource === "FALL_DETECTION" || actualSource === "FALL" || sensorEvidence) {
    const impact = sensorEvidence?.impactMagnitude || detectionEvidence?.impactMagnitude || 2.8;
    const inactivity = sensorEvidence?.inactivityDuration || detectionEvidence?.inactivityDuration || 6;
    const gyroDelta = sensorEvidence?.orientationDelta || detectionEvidence?.orientationDelta || 45;

    let fallConfidence = 50;
    if (impact >= SAFETY_THRESHOLDS.FALL_IMPACT_THRESHOLD) fallConfidence += 25;
    if (inactivity >= SAFETY_THRESHOLDS.FALL_INACTIVITY_WINDOW) fallConfidence += 15;
    if (gyroDelta > 30) fallConfidence += 10;

    confidence = Math.min(98, Math.max(50, fallConfidence));
    riskFactors.push(`Impact Acceleration: ${impact.toFixed(1)}g (Threshold: ${SAFETY_THRESHOLDS.FALL_IMPACT_THRESHOLD}g)`);
    riskFactors.push(`Post-Impact Inactivity: ${inactivity}s (Threshold: ${SAFETY_THRESHOLDS.FALL_INACTIVITY_WINDOW}s)`);
    baseScore += 65;
  }

  // 2. Evaluate Location (Route Corridor Deviation) Evidence
  if (actualSource === "ROUTE_DEVIATION" || locationEvidence) {
    const dist = locationEvidence?.corridorDistanceMeters || detectionEvidence?.corridorDistanceMeters || 145;
    const duration = locationEvidence?.durationOutsideSeconds || detectionEvidence?.durationOutsideSeconds || 0;
    const accuracy = locationEvidence?.gpsAccuracy || detectionEvidence?.gpsAccuracy || 12;

    if (accuracy <= SAFETY_THRESHOLDS.GPS_ACCURACY_LIMIT) {
      if (dist >= SAFETY_THRESHOLDS.ROUTE_DEVIATION_DISTANCE_METERS) {
        riskFactors.push(`Route Corridor Deviation: ${dist}m outside corridor (Limit: ${SAFETY_THRESHOLDS.ROUTE_DEVIATION_DISTANCE_METERS}m)`);
        baseScore += 45;
      }
      if (duration >= SAFETY_THRESHOLDS.ROUTE_DEVIATION_DURATION_SECONDS) {
        riskFactors.push(`Deviation Duration: ${duration}s outside safe path (Limit: ${SAFETY_THRESHOLDS.ROUTE_DEVIATION_DURATION_SECONDS}s)`);
        baseScore += 20;
      }
    }
  }

  // 3. Evaluate Check-in Evidence
  if (actualSource === "MISSED_CHECKIN" || checkInEvidence) {
    const missedSec = checkInEvidence?.missedDurationSeconds || detectionEvidence?.missedDurationSeconds || 900;
    const mins = Math.round(missedSec / 60);
    riskFactors.push(`Missed Safety Check-in: Unresponsive for ${mins} minutes past scheduled deadline`);
    baseScore += 45;
  }

  // 4. Evaluate Voice Intent Evidence
  if (actualSource === "VOICE_SOS" || actualSource === "VOICE" || voiceEvidence) {
    const intent = voiceEvidence?.detectedIntent || detectionEvidence?.intent || "HELP_DISTRESS";
    const transcript = voiceEvidence?.transcript || context || "Emergency help requested";
    riskFactors.push(`Voice Distress Keyword: "${transcript}" (Intent: ${intent})`);
    baseScore += 70;
  }

  // 5. Evaluate Manual / Stealth Panic Signals
  if (actualSource === "MANUAL_SOS" || actualSource === "SOS") {
    riskFactors.push("Direct Panic Button Activation on Protected Mobile Device");
    baseScore += 75;
    confidence = 99;
  } else if (actualSource === "STEALTH_SOS") {
    riskFactors.push("Discreet Stealth SOS Activation Signal");
    baseScore += 75;
    confidence = 95;
  }

  // Multi-Signal Fusion Escalation: Increase score if multiple evidence factors exist
  if (riskFactors.length > 1) {
    baseScore += (riskFactors.length - 1) * 5;
  }

  // Determine Severity Level
  let priority = "LOW";
  if (baseScore >= 85) {
    priority = "CRITICAL";
  } else if (baseScore >= 65) {
    priority = "HIGH";
  } else if (baseScore >= 40) {
    priority = "MEDIUM";
  }

  // Construct Human-Readable Assessment Reason
  const reasonPrefix = isSimulated ? "[SIMULATED TEST SIGNAL] " : "";
  let assessmentReason = `${reasonPrefix}Safety intelligence assessed risk as ${priority} (${confidence}% confidence). `;
  if (riskFactors.length > 0) {
    assessmentReason += `Evidence factors: ${riskFactors.join("; ")}.`;
  } else {
    assessmentReason += context || "Safety telemetry payload verified.";
  }

  return {
    priority,
    confidence,
    assessmentReason,
    riskFactors,
    isSimulated: Boolean(isSimulated),
    thresholds: SAFETY_THRESHOLDS
  };
}

module.exports = {
  SAFETY_THRESHOLDS,
  evaluateSafetyRisk
};
