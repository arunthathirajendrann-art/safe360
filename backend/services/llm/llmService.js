const { GoogleGenAI } = require("@google/genai");
const { evaluateSafetyRisk } = require("../incidentEngine/riskEngine");

/**
 * Convert all supported incoming trigger/type aliases
 * into the canonical Safe360 incident type.
 */
function normalizeIncidentType(type, context = "", detectionEvidence = {}) {
  const rawStr = String(type || "").toUpperCase().trim();
  const normalizedType = rawStr.replace(/[\s\-]/g, "_");

  const typeMapping = {
    SOS: "SOS",
    MANUAL_SOS: "SOS",
    SOS_BUTTON: "SOS",

    STEALTH_SOS: "STEALTH_SOS",
    STEALTH: "STEALTH_SOS",

    FALL: "FALL_DETECTION",
    FALL_DETECTION: "FALL_DETECTION",
    FALL_IMPACT: "FALL_DETECTION",

    ROUTE: "ROUTE_DEVIATION",
    ROUTE_DEVIATION: "ROUTE_DEVIATION",
    ROUTE_ALERT: "ROUTE_DEVIATION",
    CORRIDOR_DEVIATION: "ROUTE_DEVIATION",

    CHECKIN: "MISSED_CHECKIN",
    CHECK_IN: "MISSED_CHECKIN",
    MISSED_CHECKIN: "MISSED_CHECKIN",
    MISSED_CHECK_IN: "MISSED_CHECKIN",
    CHECK_IN_TIMEOUT: "MISSED_CHECKIN",
    CHECKIN_TIMEOUT: "MISSED_CHECKIN",
    MISSED: "MISSED_CHECKIN",

    VOICE: "VOICE_SOS",
    VOICE_SOS: "VOICE_SOS",
  };

  if (typeMapping[normalizedType]) {
    return typeMapping[normalizedType];
  }

  // Check detectionEvidence.trigger or source if provided
  const trigger = String(detectionEvidence?.trigger || "").toUpperCase().replace(/[\s\-]/g, "_");
  const source = String(detectionEvidence?.source || "").toUpperCase().replace(/[\s\-]/g, "_");
  if (typeMapping[trigger]) return typeMapping[trigger];
  if (typeMapping[source]) return typeMapping[source];

  // Context-based inference
  const lowerContext = String(context || "").toLowerCase();

  if (
    lowerContext.includes("check-in") ||
    lowerContext.includes("checkin") ||
    lowerContext.includes("check in") ||
    lowerContext.includes("missed") ||
    lowerContext.includes("deadline")
  ) {
    return "MISSED_CHECKIN";
  }

  if (
    lowerContext.includes("route") ||
    lowerContext.includes("corridor") ||
    lowerContext.includes("deviation") ||
    lowerContext.includes("off path")
  ) {
    return "ROUTE_DEVIATION";
  }

  if (
    lowerContext.includes("fall") ||
    lowerContext.includes("impact") ||
    lowerContext.includes("g-force")
  ) {
    return "FALL_DETECTION";
  }

  if (
    lowerContext.includes("stealth") ||
    lowerContext.includes("discreet")
  ) {
    return "STEALTH_SOS";
  }

  if (
    lowerContext.includes("help") ||
    lowerContext.includes("emergency") ||
    lowerContext.includes("sos") ||
    lowerContext.includes("save me")
  ) {
    return "VOICE_SOS";
  }

  return "SOS";
}


/**
 * Deterministic fallback assessment.
 *
 * This is used when:
 * - GEMINI_API_KEY is missing
 * - Gemini cannot be reached
 * - Gemini returns invalid JSON
 * - Gemini returns UNKNOWN
 *
 * IMPORTANT:
 * Known safety signals are never allowed to degrade to UNKNOWN.
 */
function getFallbackAssessment({
  type,
  context = "",
  detectionEvidence = {},
}) {
  const sanitizedType = normalizeIncidentType(type, context, detectionEvidence);

  const riskAssessment = evaluateSafetyRisk({
    type: sanitizedType,
    source: sanitizedType,
    context,
    detectionEvidence,
  });

  const priority = riskAssessment.priority;

  const requiresImmediateResponse =
    priority === "CRITICAL" ||
    priority === "HIGH" ||
    sanitizedType === "SOS" ||
    sanitizedType === "STEALTH_SOS";

  let typeSummary = context;

  const lowerSummary = String(typeSummary || "").toLowerCase();

  // Replace generic/stale summaries with a type-specific summary.
  if (
    !typeSummary ||
    lowerSummary.includes("emergency sos triggered") ||
    lowerSummary.includes("sos emergency button pressed")
  ) {
    switch (sanitizedType) {
      case "ROUTE_DEVIATION":
        typeSummary =
          "Protected person is outside the configured safety corridor.";
        break;

      case "FALL_DETECTION":
        typeSummary =
          "High-G motion impact fall detected; protected person unresponsive.";
        break;

      case "VOICE_SOS":
        typeSummary =
          "Voice phrase distress intent detected ('Help me, emergency').";
        break;

      case "MISSED_CHECKIN":
        typeSummary =
          "Protected person did not complete the scheduled safety check-in before the deadline.";
        break;

      case "STEALTH_SOS":
        typeSummary =
          "Discreet stealth panic signal activated on mobile device.";
        break;

      case "SOS":
      default:
        typeSummary =
          "Direct Emergency SOS button pressed on mobile device.";
        break;
    }
  }

  return {
    incidentType: sanitizedType,
    priority,
    summary: typeSummary,
    requiresImmediateResponse,
    isFallback: true,
  };
}


/**
 * Ask Gemini to assess the incident.
 *
 * The deterministic Safe360 incident type always has priority
 * over an LLM response of UNKNOWN or an invalid type.
 */
async function analyzeIncident({
  type,
  context = "",
  detectionEvidence = {},
}) {
  const apiKey = process.env.GEMINI_API_KEY;

  /*
   * Determine the originating/canonical type before calling Gemini.
   * This protects MISSED_CHECKIN and other known signals from
   * becoming UNKNOWN.
   */
  const deterministicType = normalizeIncidentType(type, context, detectionEvidence);

  if (!apiKey) {
    console.warn(
      "[LLM Service] GEMINI_API_KEY not configured. Using deterministic assessment fallback."
    );

    return getFallbackAssessment({
      type: deterministicType,
      context,
      detectionEvidence,
    });
  }

  const prompt = `
You are an AI Emergency Telemetry Analysis Assistant for the Safe360 Safety Command Center.

Analyze the following incoming emergency trigger payload and provide a structured JSON assessment.

INCIDENT TYPE: ${deterministicType}

CONTEXT / NARRATIVE:
${context || "None provided"}

DETECTION EVIDENCE:
${JSON.stringify(detectionEvidence || {})}

IMPORTANT TYPE RULES:
- If INCIDENT TYPE is SOS, return "SOS".
- If INCIDENT TYPE is STEALTH_SOS, return "STEALTH_SOS".
- If INCIDENT TYPE is FALL_DETECTION, return "FALL_DETECTION".
- If INCIDENT TYPE is ROUTE_DEVIATION, return "ROUTE_DEVIATION".
- If INCIDENT TYPE is MISSED_CHECKIN, return "MISSED_CHECKIN".
- If INCIDENT TYPE is VOICE_SOS, return "VOICE_SOS".
- NEVER return "UNKNOWN" when a valid INCIDENT TYPE is provided.

INSTRUCTIONS:

1. Determine the incidentType.
   It must be strictly one of:
   "SOS",
   "STEALTH_SOS",
   "FALL_DETECTION",
   "ROUTE_DEVIATION",
   "MISSED_CHECKIN",
   "VOICE_SOS",
   "UNKNOWN".

2. Determine the priority severity.
   It must be strictly one of:
   "LOW",
   "MEDIUM",
   "HIGH",
   "CRITICAL".

   - Panic SOS, manual panic button, stealth panic, or severe distress -> CRITICAL
   - Hard fall impact or injury indicators -> HIGH
   - Voice keywords such as help/emergency -> HIGH or CRITICAL
   - Route deviation -> MEDIUM or HIGH
   - Missed check-in -> MEDIUM or HIGH

3. Provide a concise 1-2 sentence emergency summary.

4. Set requiresImmediateResponse to true if priority is HIGH or CRITICAL.
   Otherwise set it to false.

Respond STRICTLY with JSON matching this structure:

{
  "incidentType": "SOS" | "STEALTH_SOS" | "FALL_DETECTION" | "ROUTE_DEVIATION" | "MISSED_CHECKIN" | "VOICE_SOS" | "UNKNOWN",
  "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "summary": "string",
  "requiresImmediateResponse": boolean
}
`;

  const candidateModels = [
    "gemini-3.6-flash",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
  ];

  const ai = new GoogleGenAI({ apiKey });

  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text;

      if (!text) {
        continue;
      }

      const parsed = JSON.parse(text);

      const validTypes = [
        "SOS",
        "STEALTH_SOS",
        "FALL_DETECTION",
        "ROUTE_DEVIATION",
        "MISSED_CHECKIN",
        "VOICE_SOS",
      ];

      const validPriorities = [
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
      ];

      /*
       * Normalize the type returned by Gemini as well.
       *
       * Example:
       * Gemini -> "FALL"
       * Safe360 -> "FALL_DETECTION"
       */
      const parsedType = normalizeIncidentType(
        parsed.incidentType,
        context
      );

      /*
       * CRITICAL FIX:
       *
       * If Safe360 already knows the originating type,
       * do not allow Gemini to change it.
       *
       * This specifically prevents:
       *
       * MISSED_CHECKIN -> UNKNOWN
       *
       * and also protects the other safety signals.
       */
      let sanitizedType = deterministicType;

      if (
        validTypes.includes(parsedType) &&
        parsed.incidentType !== "UNKNOWN"
      ) {
        sanitizedType = parsedType;
      }

      /*
       * The originating trigger is authoritative.
       *
       * For example:
       * MISSED_CHECKIN must remain MISSED_CHECKIN.
       */
      if (deterministicType === "MISSED_CHECKIN") {
        sanitizedType = "MISSED_CHECKIN";
      }

      if (deterministicType === "ROUTE_DEVIATION") {
        sanitizedType = "ROUTE_DEVIATION";
      }

      if (deterministicType === "FALL_DETECTION") {
        sanitizedType = "FALL_DETECTION";
      }

      if (deterministicType === "VOICE_SOS") {
        sanitizedType = "VOICE_SOS";
      }

      if (deterministicType === "STEALTH_SOS") {
        sanitizedType = "STEALTH_SOS";
      }

      if (deterministicType === "SOS") {
        sanitizedType = "SOS";
      }

      /*
       * Priority comes from Gemini when valid.
       * Otherwise use the deterministic risk engine.
       */
      const sanitizedPriority = validPriorities.includes(
        parsed.priority
      )
        ? parsed.priority
        : evaluateSafetyRisk({
            type: sanitizedType,
            source: sanitizedType,
            context,
            detectionEvidence,
          }).priority;

      /*
       * Always use a type-specific fallback summary if Gemini
       * gives an empty or stale SOS summary.
       */
      let summary =
        typeof parsed.summary === "string"
          ? parsed.summary.trim()
          : "";

      const lowerParsedSummary = summary.toLowerCase();

      if (
        !summary ||
        lowerParsedSummary.includes("sos emergency button pressed") ||
        lowerParsedSummary.includes("emergency sos triggered")
      ) {
        summary = getFallbackAssessment({
          type: sanitizedType,
          context,
          detectionEvidence,
        }).summary;
      }

      const requiresImmediateResponse =
        typeof parsed.requiresImmediateResponse === "boolean"
          ? parsed.requiresImmediateResponse
          : sanitizedPriority === "CRITICAL" ||
            sanitizedPriority === "HIGH";

      console.log(
        `[LLM Service] Analyzed successfully via model '${modelName}'.`
      );

      return {
        incidentType: sanitizedType,
        priority: sanitizedPriority,
        summary,
        requiresImmediateResponse,
        isFallback: false,
        modelUsed: modelName,
      };
    } catch (err) {
      console.warn(
        `[LLM Service] Model '${modelName}' notice:`,
        err.message
      );
    }
  }

  /*
   * All Gemini models failed.
   * Use deterministic Safe360 assessment.
   */
  console.warn(
    "[LLM Service] Reverting to deterministic assessment fallback."
  );

  return getFallbackAssessment({
    type: deterministicType,
    context,
    detectionEvidence,
  });
}


module.exports = {
  analyzeIncident,
  getFallbackAssessment,
};