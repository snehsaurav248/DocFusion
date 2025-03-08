

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
require("./cronJob.js");

const fileUploadRoutes = require("./fileUpload");
const userRoutes = require("./users");

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

// Create the necessary tables, including the daily_credits table
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

    // Table to store daily credit usage
    db.run(
      `CREATE TABLE IF NOT EXISTS daily_credits (
        date TEXT PRIMARY KEY,
        credits INTEGER
      );`,
      (err) => {
        if (err)
          console.error("❌ Error creating daily_credits table:", err.message);
        else console.log("✅ Daily credits table initialized.");
      }
    );
  });
};

// Initialize Tables Before Starting Server
createTables();

// Global counter (in-memory) that increments when a file is uploaded or scanned
// let globalCounter = 0;

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

// Global counter variable
let globalCounter = 0;

// Endpoint to simulate file upload or scan action
app.post("/api/uploadOrScan", (req, res) => {
  // Increment the global counter regardless of upload or scan action
  globalCounter++;

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];

  // Assuming the request payload contains information on whether a file was uploaded or not
  const { action } = req.body; // action could be 'upload' or 'scan'

  // Insert or update the daily credits count in the database
  db.get(
    "SELECT credits FROM daily_credits WHERE date = ?",
    [today],
    (err, row) => {
      if (err) {
        console.error("❌ Error fetching daily credits:", err.message);
        res.status(500).send("Error processing the action.");
        return;
      }

      // Action processing: increment credits count based on action type
      const incrementCredits = (action === 'upload' || action === 'scan') ? 1 : 0;

      if (row) {
        // If a record exists for today, increment the credit count
        db.run(
          "UPDATE daily_credits SET credits = credits + ? WHERE date = ?",
          [incrementCredits, today],
          (updateErr) => {
            if (updateErr) {
              console.error(
                "❌ Error updating daily credits:",
                updateErr.message
              );
              res.status(500).send("Error updating the credits.");
            } else {
              res.status(200).send("Action processed successfully");
            }
          }
        );
      } else {
        // If no record for today, insert the initial value (1 credit for the action)
        db.run(
          "INSERT INTO daily_credits (date, credits) VALUES (?, ?)",
          [today, incrementCredits],
          (insertErr) => {
            if (insertErr) {
              console.error(
                "❌ Error inserting daily credits:",
                insertErr.message
              );
              res.status(500).send("Error inserting the credits.");
            } else {
              res.status(200).send("Action processed successfully");
            }
          }
        );
      }
    }
  );
});

// Route to get analytics data (Credits used per day in the last 5 days)
app.get("/api/analytics", (req, res) => {
  // Query to get credits data for the last 5 days
  const query = `
    SELECT date, COALESCE(credits, 0) AS credits
    FROM daily_credits
    WHERE date >= datetime('now', '-5 days')
    ORDER BY date ASC;
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error("❌ Error fetching analytics data:", err.message);
      res.status(500).json({ error: "Failed to fetch analytics data." });
    } else {
      // If no data for some days, ensure we have 0 credits shown for those days
      const result = rows.length ? rows : [{ date: new Date().toISOString().split("T")[0], credits: 0 }];
      
      // Return the data in the required format
      res.json(result);
    }
  });
});



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
