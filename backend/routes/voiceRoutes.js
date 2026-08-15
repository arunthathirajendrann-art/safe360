const express = require("express");
const router = express.Router();
const { processVoiceChat } = require("../services/voice/voiceAssistantService");

/**
 * POST /api/voice/chat
 * Receives transcript and conversation history, returns Gemini AI response & safety intent.
 */
router.post("/chat", async (req, res) => {
  try {
    const { transcript, conversationHistory, userLocation, userId } = req.body;

    if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
      return res.status(400).json({
        success: false,
        message: "A non-empty transcript string is required."
      });
    }

    const result = await processVoiceChat({
      transcript: transcript.trim(),
      conversationHistory: Array.isArray(conversationHistory) ? conversationHistory : [],
      userLocation,
      userId
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("[VoiceRoutes] Error processing voice chat:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error processing voice chat.",
      error: error.message
    });
  }
});

module.exports = router;
