const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { JWT_SECRET } = require("../middleware/authMiddleware");

const register = async (req, res) => {
  try {
    const { name, email, phone, password, userType } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, phone number, and password are required"
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email address already exists"
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = `USR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const validUserType = ["STANDARD", "ELDER", "CAREGIVER"].includes(userType) ? userType : "STANDARD";

    const user = await User.create({
      userId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      passwordHash,
      userType: validUserType
    });

    const token = jwt.sign(
      { userId: user.userId, email: user.email, userType: user.userType },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error("Registration error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to register user account",
      error: error.message
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      { userId: user.userId, email: user.email, userType: user.userType },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to authenticate user",
      error: error.message
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = req.user;
    res.json({
      success: true,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch user profile"
    });
  }
};

module.exports = {
  register,
  login,
  getMe
};
