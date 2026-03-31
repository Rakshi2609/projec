const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
 
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
  },

 
  studentName: {
    type: String,
    required: false,
  },
  rollNumber: {
    type: String,
    required: false,
  },

  date: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["Present", "Absent"],
    required: true,
  },
});

module.exports = mongoose.model("Attendance", attendanceSchema);
