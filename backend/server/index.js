require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("../routes/authRoutes");
const contactRoutes = require("../routes/contactRoutes");
const incidentRoutes = require("../routes/incidentRoutes");
const voiceRoutes = require("../routes/voiceRoutes");
const { handleTwilioVoiceStatusCallback, handleTwilioVoiceTwiML } = require("../controllers/twilioVoiceCallbackController");
const { processEscalationTimeouts } = require("../services/escalation/contactEscalationService");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/voice", voiceRoutes);
app.all("/api/notifications/twilio/voice/twiml", handleTwilioVoiceTwiML);
app.post("/api/notifications/twilio/voice/status", handleTwilioVoiceStatusCallback);

app.get("/", (req, res) => {
  res.json({
    message: "SAFE360 Backend is running"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    service: "SAFE360 Backend",
    database: mongoose.connection.readyState === 1 ? "CONNECTED" : "DISCONNECTED",
    dbName: mongoose.connection.name || "safe360"
  });
});

// Helper function to sync local DB records to Atlas if Atlas becomes active
async function syncLocalToAtlas(atlasUri) {
  try {
    const localConn = await mongoose.createConnection("mongodb://127.0.0.1:27017/safe360").asPromise();
    const localCollections = await localConn.db.listCollections().toArray();
    
    for (const col of localCollections) {
      const docs = await localConn.db.collection(col.name).find({}).toArray();
      if (docs.length > 0) {
        const targetCol = mongoose.connection.db.collection(col.name);
        for (const doc of docs) {
          await targetCol.replaceOne({ _id: doc._id }, doc, { upsert: true });
        }
      }
    }
    console.log("✓ Successfully synchronized local database records to MongoDB Atlas!");
    await localConn.close();
  } catch (err) {
    // Non-fatal sync notice
  }
}

async function startServer() {
  let connected = false;

  // 1. Attempt primary MongoDB URI (e.g. MongoDB Atlas)
  if (process.env.MONGODB_URI) {
    try {
      console.log("Connecting to primary MongoDB URI (Atlas)...");
      await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
      const dbName = mongoose.connection.name || "safe360";
      console.log(`MongoDB connected successfully: ${dbName}`);
      connected = true;

      // Sync local records if present
      syncLocalToAtlas(process.env.MONGODB_URI).catch(() => {});
    } catch (err) {
      console.warn("\n=======================================================");
      console.warn("⚠️  MONGODB ATLAS CONNECTION NOTICE");
      console.warn("   Atlas URI connection could not be established.");
      console.warn("   Note: Ensure your IP address is whitelisted on MongoDB Atlas Network Access.");
      console.warn("=======================================================\n");
    }
  }

  // 2. Local MongoDB Fallback (mongodb://127.0.0.1:27017/safe360)
  if (!connected) {
    try {
      console.log("Attempting local MongoDB fallback (mongodb://127.0.0.1:27017/safe360)...");
      await mongoose.connect("mongodb://127.0.0.1:27017/safe360", { serverSelectionTimeoutMS: 3000 });
      const dbName = mongoose.connection.name || "safe360";
      console.log(`MongoDB connected successfully: ${dbName}`);
      connected = true;
    } catch (localErr) {
      console.warn("⚠️ Local MongoDB instance (27017) not running.");
    }
  }

  // 3. MongoMemoryServer Fallback (Zero-Config Development Database)
  if (!connected) {
    try {
      console.log("Spinning up MongoMemoryServer for instant zero-config development...");
      const { MongoMemoryServer } = require("mongodb-memory-server");
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      const dbName = mongoose.connection.name || "safe360";
      console.log(`MongoDB connected successfully: ${dbName}`);
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