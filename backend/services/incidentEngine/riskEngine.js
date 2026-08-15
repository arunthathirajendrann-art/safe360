/**
 * SAFE360 PHASE 5 — MULTI-SIGNAL SAFETY RISK FUSION ENGINE
 * Combines independent evidence streams (Sensors, GPS Corridor, Voice Intent, Check-ins)
 * into an explainable, weighted risk assessment with confidence metrics.
 *
 * CRITICAL ISOLATION RULE:
 * Each incident type evaluates ONLY its relevant evidence stream.
 * NEVER pollute SOS with Route Deviation or Fall evidence.
 * NEVER pollute Fall Detection with Route Deviation or Check-in evidence.
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

  const rawSource = String(source || type || "SOS").toUpperCase();

  let actualSource = "SOS";
  if (["SOS", "MANUAL_SOS", "SOS_BUTTON", "EMERGENCY_BUTTON"].includes(rawSource)) {
    actualSource = "SOS";
  } else if (["STEALTH_SOS", "STEALTH"].includes(rawSource)) {
    actualSource = "STEALTH_SOS";
  } else if (["FALL_DETECTION", "FALL"].includes(rawSource)) {
    actualSource = "FALL_DETECTION";
  } else if (["ROUTE_DEVIATION", "ROUTE"].includes(rawSource)) {
    actualSource = "ROUTE_DEVIATION";
  } else if (["MISSED_CHECKIN", "CHECKIN"].includes(rawSource)) {
    actualSource = "MISSED_CHECKIN";
  } else if (["VOICE_SOS", "VOICE"].includes(rawSource)) {
    actualSource = "VOICE_SOS";
  }

  const riskFactors = [];
  let priority = "MEDIUM";
  let confidence = 85;

  // ----------------------------------------------------
  // 1. MANUAL SOS / SOS BUTTON (Strict Emergency Signal)
  // ----------------------------------------------------
  if (actualSource === "SOS") {
    priority = "CRITICAL";
    confidence = 99;
    riskFactors.push("Direct Panic SOS Button Activation on Protected Mobile Device");
  }

  // ----------------------------------------------------
  // 2. STEALTH SOS (Discreet Panic Signal)
  // ----------------------------------------------------
  else if (actualSource === "STEALTH_SOS") {
    priority = "CRITICAL";
    confidence = 95;
    riskFactors.push("Discreet Stealth SOS Activation Signal");
  }

  // ----------------------------------------------------
  // 3. FALL DETECTION (Sensor Evidence Only)
  // ----------------------------------------------------
  else if (actualSource === "FALL_DETECTION") {
    priority = "HIGH";
    const impact = sensorEvidence?.impactMagnitude ?? detectionEvidence?.impactMagnitude ?? detectionEvidence?.impactG;
    const inactivity = sensorEvidence?.inactivityDuration ?? detectionEvidence?.inactivityDuration;
    const gyroDelta = sensorEvidence?.orientationDelta ?? detectionEvidence?.orientationDelta;

    if (impact !== undefined || inactivity !== undefined || gyroDelta !== undefined) {
      let fallConfidence = 50;
      const impactVal = Number(impact || 2.5);
      const inactivityVal = Number(inactivity || 5);
      const gyroVal = Number(gyroDelta || 30);

      if (impactVal >= SAFETY_THRESHOLDS.FALL_IMPACT_THRESHOLD) fallConfidence += 25;
      if (inactivityVal >= SAFETY_THRESHOLDS.FALL_INACTIVITY_WINDOW) fallConfidence += 15;
      if (gyroVal >= 30) fallConfidence += 10;

      confidence = Math.min(98, Math.max(70, fallConfidence));
      riskFactors.push(`Impact Acceleration: ${impactVal.toFixed(1)}g (Threshold: ${SAFETY_THRESHOLDS.FALL_IMPACT_THRESHOLD}g)`);
      riskFactors.push(`Post-Impact Inactivity: ${inactivityVal}s (Threshold: ${SAFETY_THRESHOLDS.FALL_INACTIVITY_WINDOW}s)`);

      if (impactVal >= 4.0 || inactivityVal >= 15) {
        priority = "CRITICAL";
      }
    } else {
      confidence = 90;
      riskFactors.push("High-G Accelerometer Motion Sensor Fall Triggered");
    }
  }

  // ----------------------------------------------------
  // 4. ROUTE DEVIATION (Location Corridor Evidence Only)
  // ----------------------------------------------------
  else if (actualSource === "ROUTE_DEVIATION") {
    const dist = locationEvidence?.corridorDistanceMeters ?? detectionEvidence?.corridorDistanceMeters ?? detectionEvidence?.deviationMeters;
    const duration = locationEvidence?.durationOutsideSeconds ?? detectionEvidence?.durationOutsideSeconds;
    const accuracy = locationEvidence?.gpsAccuracy ?? detectionEvidence?.gpsAccuracy ?? 12;

    if (dist !== undefined || duration !== undefined) {
      const distVal = Number(dist || 100);
      const durationVal = Number(duration || 60);

      if (distVal >= SAFETY_THRESHOLDS.ROUTE_DEVIATION_DISTANCE_METERS) {
        riskFactors.push(`Route Corridor Deviation: ${distVal}m outside corridor (Limit: ${SAFETY_THRESHOLDS.ROUTE_DEVIATION_DISTANCE_METERS}m)`);
      }
      if (durationVal >= SAFETY_THRESHOLDS.ROUTE_DEVIATION_DURATION_SECONDS) {
        riskFactors.push(`Deviation Duration: ${durationVal}s outside safe path (Limit: ${SAFETY_THRESHOLDS.ROUTE_DEVIATION_DURATION_SECONDS}s)`);
      }
      confidence = accuracy <= SAFETY_THRESHOLDS.GPS_ACCURACY_LIMIT ? 90 : 75;
      priority = (distVal >= 250 || durationVal >= 180) ? "HIGH" : "MEDIUM";
    } else {
      confidence = 85;
      priority = "MEDIUM";
      riskFactors.push("Route Corridor Safe-Path Deviation Telemetry Alert");
    }
  }

  // ----------------------------------------------------
  // 5. MISSED CHECK-IN (Check-In Session Evidence Only)
  // ----------------------------------------------------
  else if (actualSource === "MISSED_CHECKIN") {
    const missedSec = checkInEvidence?.missedDurationSeconds ?? detectionEvidence?.missedDurationSeconds;
    if (missedSec !== undefined) {
      const mins = Math.round(Number(missedSec) / 60);
      riskFactors.push(`Missed Safety Check-in: Unresponsive for ${mins} minutes past scheduled deadline`);
      priority = mins >= 30 ? "HIGH" : "MEDIUM";
    } else {
      riskFactors.push("Scheduled Safety Check-in Deadline Missed");
      priority = "MEDIUM";
    }
    confidence = 90;
  }

  // ----------------------------------------------------
  // 6. VOICE SOS (Voice Phrase & Intent Evidence Only)
  // ----------------------------------------------------
  else if (actualSource === "VOICE_SOS") {
    const intent = voiceEvidence?.detectedIntent ?? detectionEvidence?.intent ?? "HELP_DISTRESS";
    const transcript = voiceEvidence?.transcript ?? context ?? "Help me, emergency";
    const lowerPhrase = String(transcript).toLowerCase();

    if (lowerPhrase.includes("help") || lowerPhrase.includes("emergency") || lowerPhrase.includes("save me") || lowerPhrase.includes("danger")) {
      priority = "HIGH";
      confidence = 95;
    } else {
      priority = "MEDIUM";
      confidence = 88;
    }

    riskFactors.push(`Voice Distress Keyword: "${transcript}" (Intent: ${intent})`);
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
