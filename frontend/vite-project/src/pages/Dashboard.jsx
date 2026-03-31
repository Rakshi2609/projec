import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../api";

function Dashboard() {
  const navigate = useNavigate();
  const teacher = JSON.parse(localStorage.getItem("teacher") || "{}");

  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Sidebar active section
  const [section, setSection] = useState("summary");

  // Summary tab
  const [viewMode, setViewMode] = useState("all");

  // Date-wise tab
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [dateAttendance, setDateAttendance] = useState({});
  const [isLocked, setIsLocked] = useState(false);

  // History modal
  const [historyStudent, setHistoryStudent] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);

  // Overview stats
  const [overviewStats, setOverviewStats] = useState({});

  // Sidebar open on mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // --- Data fetching ---
  const fetchRecords = async (mode = viewMode) => {
    try {
      setLoading(true);
      let url = "/attendance/all";
      if (mode === "today") url = "/attendance/today";
      const res = await api.get(url);
      setRecords(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const res = await api.get("/students");
      setStudents(res.data);
      await fetchAttendanceByDate(selectedDate);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRecords("all");
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Date-wise ---
  const fetchAttendanceByDate = async (dateStr) => {
    try {
      const res = await api.get(`/attendance?date=${dateStr}`);
      const map = {};
      res.data.forEach((rec) => {
        const key =
          typeof rec.studentId === "string"
            ? rec.studentId
            : rec.studentId && rec.studentId._id
              ? rec.studentId._id
              : null;
        if (key) map[key] = rec.status === "Present" ? "Present" : "Absent";
      });
      setDateAttendance(map);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDateChange = async (e) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    setIsLocked(false);
    if (newDate) await fetchAttendanceByDate(newDate);
  };

  const toggleAttendance = (student) => {
    if (!selectedDate || isLocked) return;
    setDateAttendance((prev) => {
      const current = prev[student._id] === "Present" ? "Present" : "Absent";
      return { ...prev, [student._id]: current === "Present" ? "Absent" : "Present" };
    });
  };

  const bulkSetAttendance = (targetStatus) => {
    if (!selectedDate || isLocked) return;
    setDateAttendance((prev) => {
      const next = { ...prev };
      students.forEach((s) => (next[s._id] = targetStatus));
      return next;
    });
  };

  const submitAttendance = async () => {
    if (!selectedDate || isLocked) return;
    try {
      setLoading(true);
      for (const student of students) {
        const status = dateAttendance[student._id] || "Absent";
        await api.post("/attendance", {
          studentId: String(student._id),
          rollNumber: String(student.rollNumber ?? student._id),
          studentName: student.name || "Student",
          date: selectedDate,
          status,
        });
      }
      setIsLocked(true);
      toast.success("Attendance submitted successfully!");
      await fetchAttendanceByDate(selectedDate);
    } catch (err) {
      toast.error("Failed to submit attendance");
    } finally {
      setLoading(false);
    }
  };

  // --- History modal ---
  const openHistory = async (student) => {
    try {
      setLoading(true);
      const res = await api.get(`/attendance/student/${student._id}`);
      setHistoryStudent(student);
      setHistoryRecords(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const closeHistory = () => {
    setHistoryStudent(null);
    setHistoryRecords([]);
  };

  // --- Overview stats ---
  const loadOverviewStats = async () => {
    if (!students.length) return;
    try {
      setLoading(true);
      const results = await Promise.all(
        students.map(async (student) => {
          const res = await api.get(`/attendance/student/${student._id}`);
          const recs = res.data || [];
          const total = recs.length;
          const present = recs.filter((r) => r.status === "Present").length;
          return {
            studentId: student._id,
            total,
            present,
            absent: total - present,
            percent: total > 0 ? ((present / total) * 100).toFixed(1) : "0.0",
          };
        })
      );
      const map = {};
      results.forEach((stat) => (map[stat.studentId] = stat));
      setOverviewStats(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- Computed values ---
  const total = records.length;
  const presentCount = records.filter((r) => r.status === "Present").length;
  const absentCount = records.filter((r) => r.status === "Absent").length;

  const historyTotal = historyRecords.length;
  const historyPresent = historyRecords.filter((r) => r.status === "Present").length;
  const historyAbsent = historyTotal - historyPresent;
  const historyPercent =
    historyTotal > 0 ? ((historyPresent / historyTotal) * 100).toFixed(1) : "0.0";

  const dayTotal = students.length;
  const dayPresent = students.reduce((count, s) => {
    return count + ((dateAttendance[s._id] || "Absent") === "Present" ? 1 : 0);
  }, 0);
  const dayAbsent = dayTotal - dayPresent;
  const dayPercent = dayTotal > 0 ? ((dayPresent / dayTotal) * 100).toFixed(1) : "0.0";

  const filteredRecords = useMemo(() => {
    const term = search.toLowerCase();
    return records.filter((r) => {
      const name = (r.studentName || "").toLowerCase();
      const roll = (r.rollNumber || "").toString().toLowerCase();
      return name.includes(term) || roll.includes(term);
    });
  }, [records, search]);

  // Quick mark form state
  const [qName, setQName] = useState("");
  const [qRoll, setQRoll] = useState("");
  const [qStatus, setQStatus] = useState("Present");
  const [qErrors, setQErrors] = useState({});

  const handleQuickMark = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!qName.trim()) errs.name = "Name required";
    if (!qRoll.trim()) errs.roll = "Roll number required";
    if (Object.keys(errs).length > 0) { setQErrors(errs); return; }
    setQErrors({});
    try {
      await api.post("/attendance/mark", { studentName: qName, rollNumber: qRoll, status: qStatus });
      setQName(""); setQRoll(""); setQStatus("Present");
      toast.success("Attendance marked!");
      fetchRecords();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this attendance record?")) return;
    try {
      setLoading(true);
      await api.delete(`/attendance/${id}`);
      toast.success("Record deleted");
      await fetchRecords();
    } catch (err) {
      toast.error("Delete failed");
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("teacher");
    toast.info("Logged out");
    navigate("/login");
  };

  // Sidebar items
  const sidebarItems = [
    { id: "summary", icon: "📊", label: "Summary" },
    { id: "datewise", icon: "📅", label: "Date-wise" },
    { id: "overview", icon: "👥", label: "Overview" },
    { id: "manage", icon: "✏️", label: "Students" },
    { id: "reports", icon: "📄", label: "Reports" },
  ];

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">📋</div>
          <h2>Attendance</h2>
        </div>

        <nav className="sidebar-nav">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`sidebar-item ${section === item.id ? "active" : ""}`}
              onClick={() => {
                setSection(item.id);
                setSidebarOpen(false);
                if (item.id === "overview") loadOverviewStats();
              }}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="teacher-info">
            <div className="teacher-avatar">{(teacher.name || "T")[0].toUpperCase()}</div>
            <div className="teacher-details">
              <span className="teacher-name">{teacher.name || "Teacher"}</span>
              <span className="teacher-email">{teacher.email || ""}</span>
            </div>
          </div>
          <button type="button" className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile hamburger */}
      <button
        type="button"
        className="hamburger"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        ☰
      </button>

      {/* Main content */}
      <main className="main-content">
        <div className="page-header">
          <h1>
            {section === "summary" && "Attendance Summary"}
            {section === "datewise" && "Date-wise Attendance"}
            {section === "overview" && "Students Overview"}
            {section === "manage" && "Manage Students"}
            {section === "reports" && "Reports"}
          </h1>
        </div>

        {loading && <div className="loading-bar"></div>}

        {/* ===================== SUMMARY ===================== */}
        {section === "summary" && (
          <div className="section-content fade-in">
            <div className="sub-tabs">
              <button type="button" className={viewMode === "all" ? "sub-tab active" : "sub-tab"} onClick={() => { setViewMode("all"); fetchRecords("all"); }}>
                All Records
              </button>
              <button type="button" className={viewMode === "today" ? "sub-tab active" : "sub-tab"} onClick={() => { setViewMode("today"); fetchRecords("today"); }}>
                Today
              </button>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📋</div>
                <div className="stat-value">{total}</div>
                <div className="stat-label">Total Records</div>
              </div>
              <div className="stat-card present">
                <div className="stat-icon">✅</div>
                <div className="stat-value">{presentCount}</div>
                <div className="stat-label">Present</div>
              </div>
              <div className="stat-card absent">
                <div className="stat-icon">❌</div>
                <div className="stat-value">{absentCount}</div>
                <div className="stat-label">Absent</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📈</div>
                <div className="stat-value">{total > 0 ? ((presentCount / total) * 100).toFixed(1) : "0"}%</div>
                <div className="stat-label">Attendance Rate</div>
              </div>
            </div>

            {/* Quick mark form */}
            <div className="card-section">
              <h3>Quick Mark Attendance</h3>
              <form className="inline-form" onSubmit={handleQuickMark} noValidate>
                <div className="inline-field">
                  <input type="text" placeholder="Student Name" value={qName} onChange={(e) => setQName(e.target.value)} className={qErrors.name ? "input-error" : ""} />
                  {qErrors.name && <span className="field-error">{qErrors.name}</span>}
                </div>
                <div className="inline-field">
                  <input type="text" placeholder="Roll Number" value={qRoll} onChange={(e) => setQRoll(e.target.value)} className={qErrors.roll ? "input-error" : ""} />
                  {qErrors.roll && <span className="field-error">{qErrors.roll}</span>}
                </div>
                <select value={qStatus} onChange={(e) => setQStatus(e.target.value)}>
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                </select>
                <button type="submit" className="btn btn-primary">Mark</button>
              </form>
            </div>

            {/* Search */}
            <input className="search-input" type="text" placeholder="🔍 Search by name or roll number..." value={search} onChange={(e) => setSearch(e.target.value)} />

            {/* Records table */}
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Roll No</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length === 0 ? (
                    <tr><td colSpan="5" className="empty-row">No records found</td></tr>
                  ) : (
                    filteredRecords.map((rec) => (
                      <tr key={rec._id}>
                        <td>{rec.studentName}</td>
                        <td>{rec.rollNumber}</td>
                        <td><span className={`badge ${rec.status === "Present" ? "badge-present" : "badge-absent"}`}>{rec.status}</span></td>
                        <td>{new Date(rec.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                        <td><button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(rec._id)}>Delete</button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================== DATE-WISE ===================== */}
        {section === "datewise" && (
          <div className="section-content fade-in">
            <div className="datewise-controls">
              <div className="date-picker-group">
                <label htmlFor="att-date">Select Date:</label>
                <input id="att-date" type="date" value={selectedDate} onChange={handleDateChange} />
              </div>
              <div className="btn-group">
                <button type="button" className="btn btn-success" disabled={isLocked} onClick={() => bulkSetAttendance("Present")}>All Present</button>
                <button type="button" className="btn btn-danger" disabled={isLocked} onClick={() => bulkSetAttendance("Absent")}>All Absent</button>
                <button type="button" className="btn btn-primary" disabled={isLocked} onClick={submitAttendance}>{isLocked ? "✅ Locked" : "Submit"}</button>
              </div>
            </div>

            <div className="stats-grid stats-sm">
              <div className="stat-card"><div className="stat-value">{dayTotal}</div><div className="stat-label">Total</div></div>
              <div className="stat-card present"><div className="stat-value">{dayPresent}</div><div className="stat-label">Present</div></div>
              <div className="stat-card absent"><div className="stat-value">{dayAbsent}</div><div className="stat-label">Absent</div></div>
              <div className="stat-card"><div className="stat-value">{dayPercent}%</div><div className="stat-label">Rate</div></div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Name</th><th>Roll No</th><th>Status</th><th>Toggle</th><th>History</th></tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const isPresent = (dateAttendance[student._id] || "Absent") === "Present";
                    return (
                      <tr key={student._id}>
                        <td>{student.name}</td>
                        <td>{student.rollNumber}</td>
                        <td><span className={`badge ${isPresent ? "badge-present" : "badge-absent"}`}>{isPresent ? "Present" : "Absent"}</span></td>
                        <td><button type="button" className={`btn btn-sm ${isPresent ? "btn-danger" : "btn-success"}`} disabled={isLocked} onClick={() => toggleAttendance(student)}>{isPresent ? "Mark Absent" : "Mark Present"}</button></td>
                        <td><button type="button" className="btn btn-outline btn-sm" onClick={() => openHistory(student)}>History</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================== OVERVIEW ===================== */}
        {section === "overview" && (
          <div className="section-content fade-in">
            <div className="section-actions">
              <button type="button" className="btn btn-outline" onClick={loadOverviewStats}>↻ Refresh</button>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Name</th><th>Roll No</th><th>Total Days</th><th>Present</th><th>Absent</th><th>Attendance %</th></tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const stats = overviewStats[student._id] || { total: 0, present: 0, absent: 0, percent: "0.0" };
                    return (
                      <tr key={student._id}>
                        <td>{student.name}</td>
                        <td>{student.rollNumber}</td>
                        <td>{stats.total}</td>
                        <td>{stats.present}</td>
                        <td>{stats.absent}</td>
                        <td>
                          <div className="progress-cell">
                            <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${stats.percent}%` }}></div></div>
                            <span>{stats.percent}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================== MANAGE STUDENTS ===================== */}
        {section === "manage" && <ManageStudentsSection students={students} onRefresh={loadStudents} />}

        {/* ===================== REPORTS ===================== */}
        {section === "reports" && <ReportsSection />}
      </main>

      {/* History modal */}
      {historyStudent && (
        <div className="modal-overlay" onClick={closeHistory}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{historyStudent.name} <span className="text-muted">(Roll {historyStudent.rollNumber})</span></h2>
              <button type="button" className="modal-close" onClick={closeHistory}>✕</button>
            </div>
            <div className="stats-grid stats-sm">
              <div className="stat-card"><div className="stat-value">{historyTotal}</div><div className="stat-label">Total</div></div>
              <div className="stat-card present"><div className="stat-value">{historyPresent}</div><div className="stat-label">Present</div></div>
              <div className="stat-card absent"><div className="stat-value">{historyAbsent}</div><div className="stat-label">Absent</div></div>
              <div className="stat-card"><div className="stat-value">{historyPercent}%</div><div className="stat-label">Rate</div></div>
            </div>
            <div className="table-wrapper modal-table">
              <table>
                <thead><tr><th>Date</th><th>Status</th></tr></thead>
                <tbody>
                  {historyRecords.map((rec) => (
                    <tr key={rec._id}>
                      <td>{new Date(rec.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td><span className={`badge ${rec.status === "Present" ? "badge-present" : "badge-absent"}`}>{rec.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Manage Students sub-component ---------- */
function ManageStudentsSection({ students, onRefresh }) {
  const [name, setName] = useState("");
  const [roll, setRoll] = useState("");
  const [editId, setEditId] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!roll && roll !== 0) errs.roll = "Roll number is required";
    else if (isNaN(Number(roll))) errs.roll = "Roll number must be a number";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    try {
      setLoading(true);
      if (editId) {
        await api.put(`/students/${editId}`, { name: name.trim(), rollNumber: Number(roll) });
        toast.success("Student updated!");
      } else {
        await api.post("/students", { name: name.trim(), rollNumber: Number(roll) });
        toast.success("Student added!");
      }
      setName(""); setRoll(""); setEditId(null);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (student) => {
    setEditId(student._id);
    setName(student.name);
    setRoll(String(student.rollNumber));
    setErrors({});
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm("Delete this student?")) return;
    try {
      await api.delete(`/students/${id}`);
      toast.success("Student deleted");
      onRefresh();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const handleSeed = async () => {
    try {
      setLoading(true);
      await api.post("/students/seed");
      toast.success("20 students seeded!");
      onRefresh();
    } catch (err) {
      toast.error("Seed failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section-content fade-in">
      <div className="card-section">
        <h3>{editId ? "Edit Student" : "Add New Student"}</h3>
        <form className="inline-form" onSubmit={handleSubmit} noValidate>
          <div className="inline-field">
            <input type="text" placeholder="Student Name" value={name} onChange={(e) => setName(e.target.value)} className={errors.name ? "input-error" : ""} />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>
          <div className="inline-field">
            <input type="number" placeholder="Roll Number" value={roll} onChange={(e) => setRoll(e.target.value)} className={errors.roll ? "input-error" : ""} />
            {errors.roll && <span className="field-error">{errors.roll}</span>}
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>{editId ? "Update" : "Add"}</button>
          {editId && <button type="button" className="btn btn-outline" onClick={() => { setEditId(null); setName(""); setRoll(""); }}>Cancel</button>}
        </form>
      </div>

      <div className="section-actions">
        <button type="button" className="btn btn-outline" onClick={handleSeed}>Seed 20 Students</button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead><tr><th>Name</th><th>Roll No</th><th>Actions</th></tr></thead>
          <tbody>
            {students.length === 0 ? (
              <tr><td colSpan="3" className="empty-row">No students yet. Add one above or seed defaults.</td></tr>
            ) : (
              students.map((s) => (
                <tr key={s._id}>
                  <td>{s.name}</td>
                  <td>{s.rollNumber}</td>
                  <td>
                    <div className="btn-group">
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => handleEdit(s)}>Edit</button>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDeleteStudent(s._id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Reports sub-component ---------- */
function ReportsSection() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reportData, setReportData] = useState([]);
  const [errors, setErrors] = useState({});

  const handleGenerate = async () => {
    const errs = {};
    if (!from) errs.from = "Start date required";
    if (!to) errs.to = "End date required";
    if (from && to && new Date(from) > new Date(to)) errs.to = "End date must be after start date";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    try {
      const res = await api.get(`/attendance/range?from=${from}&to=${to}`);
      setReportData(res.data);
      if (res.data.length === 0) toast.info("No records in this range");
    } catch (err) {
      toast.error("Failed to fetch report");
    }
  };

  const handleDownloadCSV = async () => {
    if (!from || !to) { toast.error("Select date range first"); return; }
    try {
      const res = await api.get(`/attendance/report?from=${from}&to=${to}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `attendance_${from}_to_${to}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("CSV downloaded!");
    } catch (err) {
      toast.error("Download failed");
    }
  };

  // Group by student for summary bar
  const studentSummary = useMemo(() => {
    const map = {};
    reportData.forEach((r) => {
      const key = r.studentName || r.rollNumber || "Unknown";
      if (!map[key]) map[key] = { name: key, roll: r.rollNumber, present: 0, absent: 0, total: 0 };
      map[key].total++;
      if (r.status === "Present") map[key].present++;
      else map[key].absent++;
    });
    return Object.values(map);
  }, [reportData]);

  return (
    <div className="section-content fade-in">
      <div className="card-section">
        <h3>Generate Report</h3>
        <div className="inline-form">
          <div className="inline-field">
            <label>From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={errors.from ? "input-error" : ""} />
            {errors.from && <span className="field-error">{errors.from}</span>}
          </div>
          <div className="inline-field">
            <label>To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={errors.to ? "input-error" : ""} />
            {errors.to && <span className="field-error">{errors.to}</span>}
          </div>
          <button type="button" className="btn btn-primary" onClick={handleGenerate}>Generate</button>
          <button type="button" className="btn btn-success" onClick={handleDownloadCSV}>⬇ Download CSV</button>
        </div>
      </div>

      {studentSummary.length > 0 && (
        <>
          <h3 className="section-subtitle">Student Summary</h3>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Name</th><th>Roll No</th><th>Total</th><th>Present</th><th>Absent</th><th>%</th></tr></thead>
              <tbody>
                {studentSummary.map((s, i) => (
                  <tr key={i}>
                    <td>{s.name}</td>
                    <td>{s.roll}</td>
                    <td>{s.total}</td>
                    <td>{s.present}</td>
                    <td>{s.absent}</td>
                    <td>
                      <div className="progress-cell">
                        <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${s.total > 0 ? ((s.present / s.total) * 100).toFixed(1) : 0}%` }}></div></div>
                        <span>{s.total > 0 ? ((s.present / s.total) * 100).toFixed(1) : "0.0"}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="section-subtitle">Detailed Records</h3>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Name</th><th>Roll No</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>
                {reportData.map((r) => (
                  <tr key={r._id}>
                    <td>{r.studentName}</td>
                    <td>{r.rollNumber}</td>
                    <td>{new Date(r.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td><span className={`badge ${r.status === "Present" ? "badge-present" : "badge-absent"}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;
