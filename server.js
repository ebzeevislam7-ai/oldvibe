const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { randomBytes } = require("crypto");

const app = express();
const PORT = process.env.PORT || 4000;

const DATA_DIR = path.join(__dirname, "databases");
const USERS_FILE = path.join(DATA_DIR, "users.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  try {
    const raw = fs.readFileSync(USERS_FILE, "utf8") || "[]";
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

app.use(cors());
app.use(express.json());

function createToken() {
  return randomBytes(24).toString("hex");
}

app.post("/api/signup", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const users = readUsers();
  const normalized = String(email).trim().toLowerCase();
  if (users.some((u) => u.email === normalized)) {
    return res.status(409).json({ error: "User already exists." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: randomBytes(12).toString("hex"),
    email: normalized,
    passwordHash,
    tokens: [],
    createdAt: new Date().toISOString(),
  };

  const token = createToken();
  user.tokens.push(token);
  users.push(user);
  writeUsers(users);

  res.json({
    id: user.id,
    email: user.email,
    token,
  });
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const users = readUsers();
  const normalized = String(email).trim().toLowerCase();
  const user = users.find((u) => u.email === normalized);
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = createToken();
  user.tokens.push(token);
  writeUsers(users);

  res.json({
    id: user.id,
    email: user.email,
    token,
  });
});

app.get("/api/check", (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "No token." });

  const users = readUsers();
  const user = users.find((u) => u.tokens?.includes(token));
  if (!user) return res.status(401).json({ error: "Invalid token." });

  res.json({ id: user.id, email: user.email });
});

// Serve the static front-end files (index.html, script.js, styles.css)
app.use(express.static(path.join(__dirname)));

// For any non-API route, return the main page
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found" });
  }
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

