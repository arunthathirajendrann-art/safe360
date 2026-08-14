require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("../routes/authRoutes");
const contactRoutes = require("../routes/contactRoutes");
const incidentRoutes = require("../routes/incidentRoutes");
const { handleTwilioVoiceStatusCallback } = require("../controllers/twilioVoiceCallbackController");
const { processEscalationTimeouts } = require("../services/escalation/contactEscalationService");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactRoutes);
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
  let connected = false;

  // 1. Attempt primary MongoDB URI (e.g. MongoDB Atlas)
  if (process.env.MONGODB_URI) {
    try {
      console.log("Connecting to primary MongoDB URI...");
      await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
      console.log("✓ Connected to MongoDB Atlas successfully");
      connected = true;
    } catch (err) {
      console.warn("\n=======================================================");
      console.warn("⚠️  MONGODB ATLAS CONNECTION TIMED OUT / BLOCKED");
      console.warn("   Reason: Your IP address is not whitelisted on MongoDB Atlas.");
      console.warn("=======================================================\n");
    }
  }

  // 2. Local MongoDB Fallback (mongodb://127.0.0.1:27017/safe360)
  if (!connected) {
    try {
      console.log("Attempting local MongoDB fallback (mongodb://127.0.0.1:27017/safe360)...");
      await mongoose.connect("mongodb://127.0.0.1:27017/safe360", { serverSelectionTimeoutMS: 3000 });
      console.log("✓ Connected to Local MongoDB Community Server successfully!");
      connected = true;
    } catch (localErr) {
      console.warn("⚠️ Local MongoDB instance (27017) not running.");
    }
  }

  // 3. MongoMemoryServer Fallback (Zero-Config Development Database)
  if (!connected) {
    try {
      console.log("Spinning up MongoMemoryServer for instant zero-config local development...");
      const { MongoMemoryServer } = require("mongodb-memory-server");
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      console.log("✓ Connected to MongoMemoryServer (In-Memory Database) successfully!");
      connected = true;
    } catch (memErr) {
      console.error("Failed to start MongoMemoryServer:", memErr.message);
    }
  }

  if (connected) {
    // Start background timeout worker (polls every 3 seconds for active timeouts)
    setInterval(() => {
      processEscalationTimeouts().catch((err) => {
        console.error("Error in background timeout worker:", err.message);
      });
    }, 3000);

    app.listen(PORT, () => {
      console.log(`SAFE360 Backend running on port ${PORT}`);
    });
  } else {
    console.error("CRITICAL: Unable to connect to any MongoDB instance.");
  }
}

startServer();