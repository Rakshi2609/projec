const express = require("express");
const jwt = require("jsonwebtoken");
const Teacher = require("../models/Teacher");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// POST /auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    const errors = [];
    if (!name || name.trim().length < 2) errors.push("Name must be at least 2 characters");
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) errors.push("Valid email is required");
    if (!password || password.length < 6) errors.push("Password must be at least 6 characters");

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(". ") });
    }

    // Check if email already exists
    const existingTeacher = await Teacher.findOne({ email: email.toLowerCase() });
    if (existingTeacher) {
      return res.status(400).json({ error: "An account with this email already exists" });
    }

    const teacher = new Teacher({ name: name.trim(), email, password });
    await teacher.save();

    const token = generateToken(teacher._id);

    res.status(201).json({
      message: "Account created successfully",
      token,
      teacher,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const teacher = await Teacher.findOne({ email: email.toLowerCase() });
    if (!teacher) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isMatch = await teacher.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = generateToken(teacher._id);

    res.json({
      message: "Login successful",
      token,
      teacher,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /auth/me  (protected)
router.get("/me", authMiddleware, async (req, res) => {
  try {
    res.json({ teacher: req.teacher });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
