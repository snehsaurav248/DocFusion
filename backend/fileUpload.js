const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");


const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "uploads");
try {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
} catch (e) {
    console.error("Error creating upload directory:", e.message);
}

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    },
});

// File Filter to allow only specific formats
const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf", "text/plain"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type! Only JPG, PNG, PDF, and TXT are allowed."), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});

// File Upload Route
router.post("/upload", upload.single("file"), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded!" });
        }
        res.json({
            message: "✅ File uploaded successfully!",
            filePath: `/uploads/${req.file.filename}`,
        });
    } catch (error) {
        res.status(500).json({ message: "File upload failed!", error: error.message });
    }
});

module.exports = router;
