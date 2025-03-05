const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const fileUploadRoutes = require("./fileUpload"); // File upload routes
const userRoutes = require("./users"); // User authentication routes

const app = express();
const PORT = 3000;

// Database path
const dbPath = path.join(__dirname, "database.sqlite");

// Ensure database file exists
if (!fs.existsSync(dbPath)) {
    console.log("⚠️ Database file not found. Creating a new one...");
    fs.writeFileSync(dbPath, "");
}

// Connect to SQLite database
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error("❌ SQLite Connection Error:", err.message);
        process.exit(1);
    } else {
        console.log(`✅ Connected to SQLite database at: ${dbPath}`);
    }
});

// Ensure `uploads` directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Function to initialize tables
const createTables = () => {
    db.run(
        `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            credits INTEGER DEFAULT 20,
            isAdmin BOOLEAN DEFAULT 0
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
            else console.log("✅ Files table initialized inside database.sqlite.");
        }
    );
};

// Initialize tables
createTables();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "*", credentials: true }));
app.use(express.static(path.join(__dirname, "../frontend"))); // Serve frontend files

// Routes
app.use("/api/auth", userRoutes); // User authentication
app.use("/api/files", fileUploadRoutes); // File upload

// Root Route - Serve index.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "index.html"));
});

// Health Check
app.get("/api/health", (req, res) => {
    res.json({ status: "✅ Server is running!" });
});

// Start Server
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
