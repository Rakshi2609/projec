const express = require("express");
const cors = require("cors");
require("dotenv").config();
require("./db");

const authRoutes = require("./routes/AuthRoutes");
const attendanceRoutes = require("./routes/AttendanceRoutes");
const studentRoutes = require("./routes/StudentRoutes");
const authMiddleware = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 5000;

// CORS – allow frontend origins
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
}));

app.use(express.json());

// Public routes
app.use("/auth", authRoutes);

// Protected routes
app.use("/attendance", authMiddleware, attendanceRoutes);
app.use("/students", authMiddleware, studentRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Smart Attendance System API is running" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
