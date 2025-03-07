const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const router = express.Router();
const SECRET_KEY = "your_secret_key";

// Database Connection
const dbPath = path.join(__dirname, "database.sqlite");
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("❌ SQLite Connection Error:", err.message);
});

// User Registration Route
router.post("/register", async (req, res) => {
    try {
        const { name, email, password, isAdmin } = req.body;
        const role = isAdmin ? "admin" : "user";

        // Input Validation
        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required!" });
        }

        console.log("🔹 Register Request Received:", req.body);

        // Check if user already exists
        db.get("SELECT * FROM users WHERE email = ?", [email], async (err, existingUser) => {
            if (err) {
                console.error("❌ Database error:", err.message);
                return res.status(500).json({ message: "Database error!" });
            }

            if (existingUser) {
                return res.status(400).json({ message: "Email already registered!" });
            }

            try {
                // Hash password
                const hashedPassword = await bcrypt.hash(password, 10);

                // Insert new user
                db.run(
                    `INSERT INTO users (name, email, password, role, isAdmin, lastReset) 
                     VALUES (?, ?, ?, ?, ?, datetime('now'))`,
                    [name, email, hashedPassword, role, isAdmin ? 1 : 0],
                    function (err) {
                        if (err) {
                            console.error("❌ Error inserting user:", err.message);
                            return res.status(500).json({ message: "Registration failed!" });
                        }
                        console.log("✅ User registered successfully:", { id: this.lastID, name, email, role });
                        res.status(201).json({ message: "✅ Registration successful!" });
                    }
                );
            } catch (hashError) {
                console.error("❌ Password Hashing Error:", hashError.message);
                res.status(500).json({ message: "Internal server error!" });
            }
        });
    } catch (error) {
        console.error("❌ Registration Error:", error.message);
        res.status(500).json({ message: "Internal server error!" });
    }
});


router.post("/login", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required!" });

    console.log("🔹 Login Request Received:", req.body);

    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
      if (err || !user) return res.status(400).json({ message: "Invalid email or password!" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: "Invalid email or password!" });

      // Reset credits if a new day
      const currentTime = new Date();
      const lastResetTime = new Date(user.lastReset);

      if (currentTime.toDateString() !== lastResetTime.toDateString()) {
        db.run("UPDATE users SET credits = 20, lastReset = datetime('now') WHERE id = ?", [user.id]);
        user.credits = 20; // Update locally
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, isAdmin: user.isAdmin },
        SECRET_KEY,
        { expiresIn: "1h" }
      );

      res.json({
        message: "✅ Login successful!",
        token,
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email, 
          role: user.role, 
          credits: user.credits,
          isAdmin: user.isAdmin
        }
      });
    });
  } catch (error) {
    console.error("❌ Login Error:", error.message);
    res.status(500).json({ message: "Internal server error!" });
  }
});


// Middleware to verify token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Access denied! No token provided." });

    try {
        const verified = jwt.verify(token, SECRET_KEY);
        req.user = verified;
        next();
    } catch (error) {
        res.status(400).json({ message: "Invalid token!" });
    }
};

// GET all users
router.get("/users", verifyToken, (req, res) => {
    db.all("SELECT id, name, email, role, isAdmin FROM users", [], (err, users) => {
        if (err) return res.status(500).json({ success: false, message: "Server error!" });
        res.json({ success: true, users });
    });
});


module.exports = router;
