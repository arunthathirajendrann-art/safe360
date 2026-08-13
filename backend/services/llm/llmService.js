const { GoogleGenAI } = require("@google/genai");
const { assessIncident } = require("../incidentEngine/assessmentEngine");

function getFallbackAssessment({ type, context = "", detectionEvidence = {} }) {
  const fallbackPriority = assessIncident({ type, context, detectionEvidence });
  const validTypes = ["SOS", "FALL", "VOICE"];
  const sanitizedType = validTypes.includes(type) ? type : "UNKNOWN";

  return {
    incidentType: sanitizedType,
    priority: fallbackPriority,
    summary: context || `Emergency trigger (${sanitizedType}) requiring verification.`,
    requiresImmediateResponse: fallbackPriority === "CRITICAL" || fallbackPriority === "HIGH",
    isFallback: true
  };
}

async function analyzeIncident({ type, context = "", detectionEvidence = {} }) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("[LLM Service] GEMINI_API_KEY not configured. Using deterministic assessment fallback.");
    return getFallbackAssessment({ type, context, detectionEvidence });
  }

  const prompt = `You are an AI Emergency Telemetry Analysis Assistant for the Safe360 Safety Command Center.
Analyze the following incoming emergency trigger payload and provide a structured JSON assessment.

INCIDENT TYPE: ${type || "UNKNOWN"}
CONTEXT / NARRATIVE: ${context || "None provided"}
DETECTION EVIDENCE: ${JSON.stringify(detectionEvidence || {})}

INSTRUCTIONS:
1. Determine the incidentType: Must be strictly one of "SOS", "FALL", "VOICE", or "UNKNOWN".
2. Determine the priority severity: Must be strictly one of "LOW", "MEDIUM", "HIGH", or "CRITICAL".
   - Panic SOS, hardware panic buttons, or critical vitals -> CRITICAL
   - Hard fall impact, unresponsiveness, or injury indicators -> HIGH
   - Voice keywords (e.g. "help", "emergency") -> MEDIUM
   - General non-critical queries -> LOW
3. Provide a concise 1-2 sentence emergency summary.
4. Set requiresImmediateResponse to true if priority is HIGH or CRITICAL, otherwise false.

Respond STRICTLY with JSON matching this exact structure:
{
  "incidentType": "SOS" | "FALL" | "VOICE" | "UNKNOWN",
  "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "summary": "string",
  "requiresImmediateResponse": boolean
}`;

  const candidateModels = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
  const ai = new GoogleGenAI({ apiKey });

  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        const validTypes = ["SOS", "FALL", "VOICE", "UNKNOWN"];
        const validPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

        const sanitizedType = validTypes.includes(parsed.incidentType) ? parsed.incidentType : (validTypes.includes(type) ? type : "UNKNOWN");
        const sanitizedPriority = validPriorities.includes(parsed.priority) ? parsed.priority : assessIncident({ type, context, detectionEvidence });

        console.log(`[LLM Service] Analyzed successfully via model '${modelName}'.`);
        return {
          incidentType: sanitizedType,
          priority: sanitizedPriority,
          summary: typeof parsed.summary === "string" ? parsed.summary : (context || "Emergency trigger assessed."),
          requiresImmediateResponse: typeof parsed.requiresImmediateResponse === "boolean"
            ? parsed.requiresImmediateResponse
            : (sanitizedPriority === "CRITICAL" || sanitizedPriority === "HIGH"),
          isFallback: false,
          modelUsed: modelName
        };
      }
    } catch (err) {
      console.warn(`[LLM Service] Model '${modelName}' notice:`, err.message);
    }
  }

  console.warn("[LLM Service] Reverting to deterministic assessment fallback.");
  return getFallbackAssessment({ type, context, detectionEvidence });
}

module.exports = {
  analyzeIncident,
  getFallbackAssessment
};
