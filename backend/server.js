const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, "data.json");
const SECRET_KEY = "your_secret_key"; // Change this for security

// Middleware
app.use(express.json());
app.use(
    cors({
        origin: "http://localhost:5173", // Adjust for your frontend URL
        credentials: true,
    })
);
app.use(express.static(path.join(__dirname, "../frontend"))); // Serve frontend

// Load data
const loadData = () => {
    if (fs.existsSync(DATA_FILE)) {
        return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    }
    return { users: [], documents: [] };
};

// Save data
const saveData = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ message: "Access denied, token missing!" });

    try {
        const verified = jwt.verify(token.replace("Bearer ", ""), SECRET_KEY);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ message: "Invalid token" });
    }
};

// Root Route
app.get("/", (req, res) => {
    res.send("Server is running!");
});

// API Welcome Message
app.get("/api/message", (req, res) => {
    res.json({ message: "Welcome to DocFusion Backend API!" });
});

// Fetch All Documents (Protected Route)
app.get("/api/documents", verifyToken, (req, res) => {
    const data = loadData();
    res.json(data.documents);
});

// Add a New Document (Protected Route)
app.post("/api/documents", verifyToken, (req, res) => {
    let data = loadData();
    const newDoc = { id: data.documents.length + 1, ...req.body };
    data.documents.push(newDoc);
    saveData(data);
    res.status(201).json(newDoc);
});

// User Registration
app.post("/api/register", async (req, res) => {
    console.log("Incoming Registration Data:", req.body); // Log request data
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: "All fields are required!" });
    }

    let data = loadData();
    if (data.users.find((user) => user.email === email)) {
        return res.status(400).json({ message: "Email already registered!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: data.users.length + 1, // Add an ID for reference
        name,
        email,
        password: hashedPassword,
        role: role || "user",
    };

    data.users.push(newUser);
    saveData(data);
    console.log("New user registered:", newUser);
    res.json({ message: "Registration successful!", user: { name, email, role } });
});

// User Login
app.post("/api/login", async (req, res) => {
    console.log("Incoming Login Data:", req.body); // Log request data
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required!" });

    let data = loadData();
    const user = data.users.find((user) => user.email === email);
    if (!user) return res.status(400).json({ message: "Invalid email or password!" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password!" });

    const token = jwt.sign({ email: user.email, role: user.role }, SECRET_KEY, { expiresIn: "1h" });
    console.log("User logged in:", { email: user.email, role: user.role });
    res.json({ message: "Login successful!", token, user: { name: user.name, email, role: user.role } });
});

// 404 Route
app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});

// Start Server
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
