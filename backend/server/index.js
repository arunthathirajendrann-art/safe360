require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const incidentRoutes = require("../routes/incidentRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/api/incidents", incidentRoutes);

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

    app.listen(PORT, () => {
      console.log(`SAFE360 Backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
  }
}

startServer();