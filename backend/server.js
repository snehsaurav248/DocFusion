const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;
const SECRET_KEY = "your_secret_key";

// Database path
const dbPath = path.join(__dirname, "database.db");

// Ensure database file exists
if (!fs.existsSync(dbPath)) {
    console.log("⚠️ Database file not found. Creating a new one...");
    fs.writeFileSync(dbPath, "");
}

// Connect to SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("❌ SQLite Connection Error:", err.message);
    } else {
        console.log("✅ Connected to SQLite database.");
    }
});

// Initialize tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        credits INTEGER DEFAULT 10
    )`);
});

// Middleware
app.use(express.json());
app.use(cors({ origin: "*", credentials: true }));
app.use(express.static(path.join(__dirname, "../frontend"))); // Serve frontend files

// Root Route - Serve index.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "index.html"));
});

// User Registration
app.post("/api/register", async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required!" });
        }

        console.log("🔹 Register Request Received:", req.body);

        // Check if user already exists
        db.get("SELECT * FROM users WHERE email = ?", [email], async (err, existingUser) => {
            if (err) return res.status(500).json({ message: "Database error!" });
            if (existingUser) return res.status(400).json({ message: "Email already registered!" });

            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert user into database
            db.run(
                `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
                [name, email, hashedPassword, role || "user"],
                function (err) {
                    if (err) {
                        console.error("❌ Registration Error:", err.message);
                        return res.status(500).json({ message: "Registration failed!" });
                    }
                    res.json({ message: "✅ Registration successful!" });
                }
            );
        });
    } catch (error) {
        console.error("❌ Registration Error:", error.message);
        res.status(500).json({ message: "Internal server error!" });
    }
});

// User Login
app.post("/api/login", (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password required!" });
        }

        console.log("🔹 Login Request Received:", req.body);

        db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
            if (err || !user) {
                return res.status(400).json({ message: "Invalid email or password!" });
            }

            // Compare password hash
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: "Invalid email or password!" });
            }

            // Generate JWT token
            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                SECRET_KEY,
                { expiresIn: "1h" }
            );

            res.json({
                message: "✅ Login successful!",
                token,
                user: { name: user.name, email: user.email, role: user.role, credits: user.credits }
            });
        });
    } catch (error) {
        console.error("❌ Login Error:", error.message);
        res.status(500).json({ message: "Internal server error!" });
    }
});

// Health Check
app.get("/api/health", (req, res) => {
    res.json({ status: "✅ Server is running!" });
});

// Start Server
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
