const express = require("express");
const router = express.Router();
const Student = require("../models/student");

// POST /students/seed – seed 20 default students
router.post("/seed", async (req, res) => {
  try {
    const studentsToSeed = Array.from({ length: 20 }).map((_, idx) => ({
      name: `Student ${idx + 1}`,
      rollNumber: idx + 1,
    }));

    const operations = studentsToSeed.map((s) => ({
      updateOne: {
        filter: { rollNumber: s.rollNumber },
        update: { $setOnInsert: s },
        upsert: true,
      },
    }));

    if (operations.length > 0) {
      await Student.bulkWrite(operations);
    }

    const allStudents = await Student.find().sort({ rollNumber: 1 });
    res.json({ message: "Students seeded successfully", students: allStudents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /students – list all students
router.get("/", async (req, res) => {
  try {
    const students = await Student.find().sort({ rollNumber: 1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /students – add a new student
router.post("/", async (req, res) => {
  try {
    const { name, rollNumber } = req.body;

    if (!name || name.trim().length < 1) {
      return res.status(400).json({ error: "Student name is required" });
    }
    if (rollNumber == null || rollNumber === "") {
      return res.status(400).json({ error: "Roll number is required" });
    }

    const existing = await Student.findOne({ rollNumber: Number(rollNumber) });
    if (existing) {
      return res.status(400).json({ error: `Roll number ${rollNumber} already exists` });
    }

    const student = new Student({ name: name.trim(), rollNumber: Number(rollNumber) });
    await student.save();
    res.status(201).json({ message: "Student added", student });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "Roll number already exists" });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /students/:id – update a student
router.put("/:id", async (req, res) => {
  try {
    const { name, rollNumber } = req.body;

    if (!name || name.trim().length < 1) {
      return res.status(400).json({ error: "Student name is required" });
    }
    if (rollNumber == null || rollNumber === "") {
      return res.status(400).json({ error: "Roll number is required" });
    }

    // Check if another student already has this roll number
    const existing = await Student.findOne({
      rollNumber: Number(rollNumber),
      _id: { $ne: req.params.id },
    });
    if (existing) {
      return res.status(400).json({ error: `Roll number ${rollNumber} already taken` });
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), rollNumber: Number(rollNumber) },
      { new: true, runValidators: true }
    );

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json({ message: "Student updated", student });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /students/:id – delete a student
router.delete("/:id", async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
