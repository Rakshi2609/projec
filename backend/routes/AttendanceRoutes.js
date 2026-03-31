const express = require("express");
const router = express.Router();
const Attendance = require("../models/attendance");

// POST /attendance/mark – quick mark
router.post("/mark", async (req, res) => {
  try {
    const { studentName, rollNumber, status } = req.body;
    if (!studentName || !rollNumber || !status) {
      return res.status(400).json({ error: "studentName, rollNumber and status are required" });
    }
    if (!["Present", "Absent"].includes(status)) {
      return res.status(400).json({ error: "Status must be Present or Absent" });
    }
    const attendance = new Attendance(req.body);
    await attendance.save();
    res.status(201).json({ message: "Attendance marked", attendance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /attendance/all
router.get("/all", async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const records = await Attendance.find().sort({ date: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /attendance?date=YYYY-MM-DD
router.get("/", async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      const records = await Attendance.find().sort({ date: -1 });
      return res.json(records);
    }

    const selected = new Date(date);
    if (Number.isNaN(selected.getTime())) {
      return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
    }

    const startOfDay = new Date(selected);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selected);
    endOfDay.setHours(23, 59, 59, 999);

    const records = await Attendance.find({
      date: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ date: -1 });

    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /attendance/batch
router.post("/batch", async (req, res) => {
  try {
    const { date, records } = req.body;

    if (!date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: "date and records array are required" });
    }

    const selected = new Date(date);
    if (Number.isNaN(selected.getTime())) {
      return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
    }

    const startOfDay = new Date(selected);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selected);
    endOfDay.setHours(23, 59, 59, 999);

    const saved = [];
    for (const item of records) {
      const studentId = item.studentId;
      const status = item.status || "Absent";
      if (!studentId) continue;

      let record = await Attendance.findOne({
        studentId,
        date: { $gte: startOfDay, $lte: endOfDay },
      });

      if (record) {
        record.status = status;
      } else {
        record = new Attendance({ studentId, date: selected, status });
      }
      await record.save();
      saved.push(record);
    }

    res.status(201).json({ message: `Attendance saved for ${saved.length} students`, count: saved.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /attendance – single student for a date
router.post("/", async (req, res) => {
  try {
    const { studentId, date, status, rollNumber, studentName } = req.body;

    if (!studentId || !date || !status) {
      return res.status(400).json({ error: "studentId, date and status are required" });
    }
    if (!["Present", "Absent"].includes(status)) {
      return res.status(400).json({ error: "Status must be Present or Absent" });
    }

    const selected = new Date(date);
    if (Number.isNaN(selected.getTime())) {
      return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
    }

    const startOfDay = new Date(selected);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selected);
    endOfDay.setHours(23, 59, 59, 999);

    let record = await Attendance.findOne({
      studentId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    const rollVal = (rollNumber != null && rollNumber !== "") ? String(rollNumber) : String(studentId);

    if (record) {
      record.status = status;
      record.rollNumber = rollVal;
      if (studentName != null) record.studentName = studentName;
    } else {
      record = new Attendance({
        studentId,
        date: selected,
        status,
        rollNumber: rollVal,
        studentName: studentName || "",
      });
    }

    await record.save();
    res.status(201).json({ message: "Attendance saved", attendance: record });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /attendance/today
router.get("/today", async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const records = await Attendance.find({
      date: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ date: -1 });

    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /attendance/by-student/:rollNumber
router.get("/by-student/:rollNumber", async (req, res) => {
  try {
    const { rollNumber } = req.params;
    const records = await Attendance.find({ rollNumber }).sort({ date: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /attendance/student/:studentId
router.get("/student/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const records = await Attendance.find({ studentId }).sort({ date: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /attendance/range?from=...&to=...
router.get("/range", async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: "from and to query params are required" });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
    }

    toDate.setHours(23, 59, 59, 999);

    const records = await Attendance.find({
      date: { $gte: fromDate, $lte: toDate },
    }).sort({ date: -1 });

    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /attendance/report?from=...&to=... – CSV export
router.get("/report", async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: "from and to query params required" });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const records = await Attendance.find({
      date: { $gte: fromDate, $lte: toDate },
    }).sort({ date: 1 });

    // Build CSV
    let csv = "Student Name,Roll Number,Date,Status\n";
    records.forEach((r) => {
      const name = (r.studentName || "").replace(/,/g, " ");
      const roll = r.rollNumber || "";
      const date = new Date(r.date).toISOString().slice(0, 10);
      csv += `${name},${roll},${date},${r.status}\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=attendance_${from}_to_${to}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /attendance/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Attendance.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: "Record not found" });
    }

    res.json({ message: "Record deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
