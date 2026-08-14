require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const incidentRoutes = require("../routes/incidentRoutes");
const { handleTwilioVoiceStatusCallback } = require("../controllers/twilioVoiceCallbackController");
const { processEscalationTimeouts } = require("../services/escalation/contactEscalationService");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/incidents", incidentRoutes);
app.post("/api/notifications/twilio/voice/status", handleTwilioVoiceStatusCallback);

app.get("/", (req, res) => {
  res.json({
    message: "SAFE360 Backend is running"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    service: "SAFE360 Backend"
  });
});

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully");

    // Start background timeout worker (polls every 3 seconds for active timeouts)
    setInterval(() => {
      processEscalationTimeouts().catch((err) => {
        console.error("Error in background timeout worker:", err.message);
      });
    }, 3000);

    app.listen(PORT, () => {
      console.log(`SAFE360 Backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
  }
}

startServer();