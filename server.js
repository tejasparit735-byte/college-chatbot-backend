const express = require("express");
const fs = require("fs");
const bcrypt = require("bcrypt");
const cors = require("cors");
const path = require("path");

const app = express();

const cors = require("cors");

const cors = require("cors");

/* ===== CORS FIX (DO NOT CHANGE) ===== */
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(express.json());



const DB_FILE = path.join(__dirname, "database.json");

/* ---------- DATABASE HELPERS ---------- */
function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const emptyDB = { students: [], colleges: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(emptyDB, null, 2));
    return emptyDB;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

/* ---------- SESSION STORE (IN-MEMORY) ---------- */
const sessions = {};

/* ---------- STUDENT REGISTER ---------- */
app.post("/api/register", async (req, res) => {
  const { name, email, password, percentage } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const db = loadDB();

  if (db.students.find(s => s.email === email)) {
    return res.status(400).json({ error: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  db.students.push({
    id: Date.now(),
    name,
    email,
    password: hashedPassword,
    percentage: percentage || 0
  });

  saveDB(db);
  res.json({ success: true });
});

/* ---------- STUDENT LOGIN ---------- */
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const db = loadDB();
  const user = db.students.find(s => s.email === email);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid login" });
  }

  const token = Math.random().toString(36).substring(2);
  sessions[token] = user.email;

  res.json({
    success: true,
    token,
    user: {
      name: user.name,
      percentage: user.percentage
    }
  });
});

/* ---------- CHECK SESSION ---------- */
app.get("/api/session", (req, res) => {
  const token = req.headers["x-session-token"];
  if (!token || !sessions[token]) {
    return res.status(401).json({ error: "Invalid session" });
  }

  const db = loadDB();
  const user = db.students.find(s => s.email === sessions[token]);

  if (!user) return res.status(401).json({ error: "User not found" });

  res.json({
    success: true,
    user: { name: user.name, percentage: user.percentage }
  });
});

/* ---------- LOGOUT ---------- */
app.post("/api/logout", (req, res) => {
  const token = req.headers["x-session-token"];
  if (token) delete sessions[token];
  res.json({ success: true });
});

/* ---------- ADMIN LOGIN ---------- */
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "Optimus" && password === "09082007") {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Invalid admin credentials" });
  }
});

/* ---------- GET COLLEGES ---------- */
app.get("/api/colleges", (req, res) => {
  const db = loadDB();
  res.json(db.colleges);
});

/* ---------- ADD COLLEGE ---------- */
app.post("/api/colleges", (req, res) => {
  const { name, info } = req.body;
  if (!name) return res.status(400).json({ error: "College name required" });

  const db = loadDB();
  db.colleges.push({
    id: Date.now(),
    name,
    info: info || "",
    staff: [],
    facilities: []
  });

  saveDB(db);
  res.json({ success: true });
});

/* ---------- EDIT COLLEGE ---------- */
app.put("/api/colleges/:id", (req, res) => {
  const { name, info } = req.body;
  const db = loadDB();

  const college = db.colleges.find(c => String(c.id) === String(req.params.id));
  if (!college) return res.status(404).json({ error: "College not found" });

  college.name = name ?? college.name;
  college.info = info ?? college.info;

  saveDB(db);
  res.json({ success: true });
});

/* ---------- DELETE COLLEGE ---------- */
app.delete("/api/colleges/:id", (req, res) => {
  const db = loadDB();
  const index = db.colleges.findIndex(c => String(c.id) === String(req.params.id));

  if (index === -1) return res.status(404).json({ error: "College not found" });

  db.colleges.splice(index, 1);
  saveDB(db);
  res.json({ success: true });
});

/* ---------- ADD STAFF ---------- */
app.post("/api/staff", (req, res) => {
  const { collegeId, name, role } = req.body;
  const db = loadDB();

  const college = db.colleges.find(c => String(c.id) === String(collegeId));
  if (!college) return res.status(404).json({ error: "College not found" });

  college.staff.push({ name, role });
  saveDB(db);
  res.json({ success: true });
});

/* ---------- DELETE STAFF ---------- */
app.delete("/api/staff", (req, res) => {
  const { collegeId, staffIndex } = req.body;
  const db = loadDB();

  const college = db.colleges.find(c => String(c.id) === String(collegeId));
  if (!college || !college.staff[staffIndex]) {
    return res.status(404).json({ error: "Staff not found" });
  }

  college.staff.splice(staffIndex, 1);
  saveDB(db);
  res.json({ success: true });
});

/* ---------- ADD FACILITY ---------- */
app.post("/api/facilities", (req, res) => {
  const { collegeId, facility } = req.body;
  const db = loadDB();

  const college = db.colleges.find(c => String(c.id) === String(collegeId));
  if (!college) return res.status(404).json({ error: "College not found" });

  college.facilities.push(facility);
  saveDB(db);
  res.json({ success: true });
});

/* ---------- DELETE FACILITY ---------- */
app.delete("/api/facilities", (req, res) => {
  const { collegeId, facilityIndex } = req.body;
  const db = loadDB();

  const college = db.colleges.find(c => String(c.id) === String(collegeId));
  if (!college || !college.facilities[facilityIndex]) {
    return res.status(404).json({ error: "Facility not found" });
  }

  college.facilities.splice(facilityIndex, 1);
  saveDB(db);
  res.json({ success: true });
});

/* ---------- START SERVER ---------- */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
