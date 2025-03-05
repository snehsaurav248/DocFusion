const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const sqlite3 = require("sqlite3").verbose();
const levenshtein = require("fast-levenshtein");

const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// SQLite Database Connection
const db = new sqlite3.Database("./database.sqlite");

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
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "application/pdf",
    "text/plain",
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type! Only JPG, PNG, PDF, and TXT are allowed."),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});

// Function to extract text from PDF and TXT files
async function extractText(filePath, mimetype) {
  if (mimetype == "application/pdf") {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } else if (mimetype === "text/plain") {
    return fs.readFileSync(filePath, "utf8");
  } else {
    return null; // Skip text extraction for images
  }
}

// Function to calculate word frequency
const wordFrequency = (text) => {
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const freq = {};
  words.forEach((word) => (freq[word] = (freq[word] || 0) + 1));
  return freq;
};

// Function to check for duplicate files
const isDuplicate = (newText, storedDocs) => {
  const newFreq = wordFrequency(newText);
  let duplicateFiles = [];

  for (const doc of storedDocs) {
    const storedFreq = wordFrequency(doc.content);
    const levenshteinDist = levenshtein.get(newText, doc.content);
    const similarity =
      1 - levenshteinDist / Math.max(newText.length, doc.content.length);

    let commonWords = 0;
    for (const word in newFreq) {
      if (storedFreq[word]) commonWords++;
    }
    const wordSim = commonWords / Object.keys(newFreq).length;

    if (similarity > 0.85 || wordSim > 0.85) {
      duplicateFiles.push(doc.filename); // Store filename of duplicate
    }
  }

  return duplicateFiles.length > 0 ? duplicateFiles : null;
};

// **File Upload Route with Duplicate Check**
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded!" });
    }

    const filePath = req.file.path;
    const mimetype = req.file.mimetype;
    const newText = await extractText(filePath, mimetype);

    if (!newText) {
      return res.status(400).json({ message: "Could not extract text!" });
    }

    // Fetch existing documents
    db.all("SELECT * FROM files", [], (err, storedDocs) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err.message });
      }

      const duplicateFiles = isDuplicate(newText, storedDocs);

      if (duplicateFiles) {
        fs.unlinkSync(filePath); // Delete uploaded file
        return res.status(400).json({
          message: "⚠️ Similar files exist!",
          duplicateFiles, // Returning array of similar filenames
        });
      }

      // Store new document
      db.run("INSERT INTO files (filename, content) VALUES (?, ?)", [req.file.filename, newText], (err) => {
        if (err) {
          return res.status(500).json({ message: "Error saving file to database" });
        }

        res.json({
          message: "✅ File uploaded successfully!",
          filePath: `/uploads/${req.file.filename}`,
        });
      });
    });
  } catch (error) {
    res.status(500).json({ message: "File upload failed!", error: error.message });
  }
});

// **Get All Uploaded Documents Route**
router.get("/documents", (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      return res.status(500).json({ message: "Failed to retrieve documents" });
    }
    const documents = files.map((file) => ({
      title: file,
      filePath: `/uploads/${file}`,
    }));
    res.json(documents);
  });
});

module.exports = router;
