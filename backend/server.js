const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
require("./cronJob.js"); 

const fileUploadRoutes = require("./fileUpload"); 
const userRoutes = require("./users"); 
// const { checkAndDeductCredit } = require("./users"); // Only if needed

const app = express();
const PORT = 3000;
const SECRET_KEY = "your-secret-key"; // Change this to a secure key

// Database Path
const dbPath = path.join(__dirname, "database.sqlite");
// Ensure Database File Exists
if (!fs.existsSync(dbPath)) {
  console.log("⚠️ Database file not found. Creating a new one...");
  fs.writeFileSync(dbPath, ""); // Creates an empty file if it doesn't exist
}

// Connect to SQLite Database
const db = new sqlite3.Database(
  dbPath,
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  (err) => {
    if (err) {
      console.error("❌ SQLite Connection Error:", err.message);
      process.exit(1);
    } else {
      console.log(`✅ Connected to SQLite database at: ${dbPath}`);
    }
  }
);

// Ensure `uploads` Directory Exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const createTables = () => {
    db.serialize(() => {
      db.run(
        `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          credits INTEGER DEFAULT 20,
          isAdmin BOOLEAN DEFAULT 0,
          lastReset TEXT DEFAULT (datetime('now'))
        );`,
        (err) => {
          if (err) console.error("❌ Error creating users table:", err.message);
          else console.log("✅ Users table initialized.");
        }
      );
  
      db.run(
        `CREATE TABLE IF NOT EXISTS files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          filename TEXT NOT NULL,
          content TEXT NOT NULL,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`,
        (err) => {
          if (err) console.error("❌ Error creating files table:", err.message);
          else console.log("✅ Files table initialized.");
        }
      );
    });
  };
  
  // Initialize Tables Before Starting Server
  createTables();
  
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "*", credentials: true }));
app.use(express.static(path.join(__dirname, "../frontend"))); // Serve Frontend Files

// ✅ Validate Middleware Before Using
if (typeof userRoutes !== "function") {
  console.error("❌ userRoutes is not a valid Express Router.");
} else {
  app.use("/api/auth", userRoutes); // Authentication Routes
}

if (typeof fileUploadRoutes !== "function") {
  console.error("❌ fileUploadRoutes is not a valid Express Router.");
} else {
  app.use("/api/files", fileUploadRoutes); // File Upload Routes
}

// // 📌 Scan Document API (Protected with JWT)
// app.post("/api/scan/document", checkAndDeductCredit, (req, res) => {
//   res.json({ message: "✅ Document scanned successfully!" });
// });

// Root Route - Serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend", "index.html"));
});

// Health Check Endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "✅ Server is running!" });
});

// Start Server
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
