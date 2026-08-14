const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "safe360-jwt-secret-key-2026";

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token required"
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findOne({ userId: decoded.userId });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found"
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authorization token",
      error: error.message
    });
  }
}

// Optional auth helper (attaches req.user if token valid, but does not block if missing)
async function optionalAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findOne({ userId: decoded.userId });
      if (user) {
        req.user = user;
      }
    }
  } catch (err) {
    // Ignore errors for optional auth
  }
  next();
}

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  JWT_SECRET
};
