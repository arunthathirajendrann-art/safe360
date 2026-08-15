const { GoogleGenAI } = require("@google/genai");

/**
 * Fallback intent classifier when Gemini API key is missing or network fails.
 */
function classifyFallbackIntent(transcript) {
  const text = String(transcript || "").toLowerCase();

  if (text.includes("sos") || text.includes("help") || text.includes("emergency") || text.includes("danger") || text.includes("unsafe") || text.includes("following me")) {
    return {
      intent: "SOS_REQUEST",
      replyText: "I understand you may be in danger. I can help trigger an SOS emergency alert to your guardians right away.",
      requiresConfirmation: true
    };
  }

  if (text.includes("fall") || text.includes("fell") || text.includes("accident") || text.includes("hurt") || text.includes("injured")) {
    return {
      intent: "INCIDENT_REPORT",
      replyText: "I recorded your report regarding a fall or accident. Would you like me to dispatch a Fall Alert incident?",
      requiresConfirmation: true
    };
  }

  if (text.includes("where am i") || text.includes("location") || text.includes("gps") || text.includes("position")) {
    return {
      intent: "LOCATION_REQUEST",
      replyText: "I can check your live GPS coordinates and location status.",
      requiresConfirmation: false
    };
  }

  if (text.includes("contact") || text.includes("parents") || text.includes("guardian") || text.includes("notify")) {
    return {
      intent: "EMERGENCY_CONTACT_REQUEST",
      replyText: "Your emergency contacts are on standby. Would you like to view your emergency contact roster?",
      requiresConfirmation: false
    };
  }

  if (text.includes("cancel") || text.includes("stop sos") || text.includes("false alarm") || text.includes("i am safe")) {
    return {
      intent: "CANCEL_SOS",
      replyText: "Glad to hear you are safe. If an active alert is running, you can cancel it using your PIN or emergency cancellation code.",
      requiresConfirmation: false
    };
  }

  return {
    intent: "GENERAL_CONVERSATION",
    replyText: `I am your Safe360 safety assistant. I heard: "${transcript}". How can I help protect you today?`,
    requiresConfirmation: false
  };
}

/**
 * Send user transcript to Gemini LLM for personal safety conversation & intent extraction.
 */
async function processVoiceChat({ transcript, conversationHistory = [], userLocation, userId }) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("[VoiceAssistantService] GEMINI_API_KEY not configured. Using fallback safety responder.");
    return classifyFallbackIntent(transcript);
  }

  const historyPrompt = conversationHistory
    .slice(-6)
    .map(msg => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
    .join("\n");

  const systemPrompt = `
You are the AI Voice Safety Assistant for the Safe360 Personal Safety Platform.
Your duty is to listen to protected users, evaluate their personal safety concerns empathetically and concisely, and identify their intent.

USER TRANSCRIPT:
"${transcript}"

CONVERSATION HISTORY:
${historyPrompt || "None"}

USER LOCATION:
${userLocation ? `Lat: ${userLocation.latitude}, Lng: ${userLocation.longitude}` : "Unknown"}

CLASSIFICATION INTENTS:
- "SOS_REQUEST": User explicitly asks for emergency help, mentions being followed, feeling unsafe, in panic, or needing immediate assistance.
- "INCIDENT_REPORT": User reports a physical fall, accident, injury, or route hazard.
- "LOCATION_REQUEST": User asks about their location, coordinates, or safety zone.
- "EMERGENCY_CONTACT_REQUEST": User asks about emergency contacts or notifying guardians.
- "CANCEL_SOS": User states they are safe or wants to cancel an active alert.
- "GENERAL_HELP": User asks how Safe360 features work.
- "GENERAL_CONVERSATION": Normal conversational dialogue or safety questions.

INSTRUCTIONS:
1. Provide a concise, clear, comforting response (1 to 3 sentences maximum) suitable for text display and spoken audio (Text-to-Speech).
2. Classify the intent strictly as one of the CLASSIFICATION INTENTS listed above.
3. If intent is "SOS_REQUEST" or "INCIDENT_REPORT", set requiresConfirmation to true.

Respond STRICTLY in JSON format:
{
  "replyText": "string",
  "intent": "SOS_REQUEST" | "INCIDENT_REPORT" | "LOCATION_REQUEST" | "EMERGENCY_CONTACT_REQUEST" | "CANCEL_SOS" | "GENERAL_HELP" | "GENERAL_CONVERSATION",
  "requiresConfirmation": boolean
}
`;

  const candidateModels = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-1.5-flash",
    "gemini-3.6-flash"
  ];

  const ai = new GoogleGenAI({ apiKey });

  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: systemPrompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text;
      if (!text) continue;

      const parsed = JSON.parse(text);

      if (parsed.replyText && parsed.intent) {
        return {
          replyText: parsed.replyText,
          intent: parsed.intent,
          requiresConfirmation: Boolean(parsed.requiresConfirmation)
        };
      }
    } catch (err) {
      console.warn(`[VoiceAssistantService] Model ${modelName} call failed:`, err.message);
    }
  }

  // Fallback if all Gemini models fail
  return classifyFallbackIntent(transcript);
}

module.exports = {
  processVoiceChat,
  classifyFallbackIntent
};
