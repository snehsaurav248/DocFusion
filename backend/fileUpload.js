const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const sqlite3 = require("sqlite3").verbose();
const levenshtein = require("fast-levenshtein");
const jwt = require("jsonwebtoken");
const { authenticateUser } = require("./auth");
const  checkCredits = require("./credit");

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
    cb(new Error("Invalid file type! Only JPG, PNG, PDF, and TXT are allowed."), false);
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

// Function to check for duplicate files and calculate similarity
const findSimilarFiles = (newText, storedDocs) => {
  const newFreq = wordFrequency(newText);
  let similarFiles = [];

  for (const doc of storedDocs) {
    const storedFreq = wordFrequency(doc.content);
    const levenshteinDist = levenshtein.get(newText, doc.content);
    const similarity = 1 - levenshteinDist / Math.max(newText.length, doc.content.length);

    let commonWords = 0;
    for (const word in newFreq) {
      if (storedFreq[word]) commonWords++;
    }
    const wordSim = commonWords / Object.keys(newFreq).length;

    const finalSimilarity = Math.max(similarity, wordSim) * 100; // Convert to percentage

    if (finalSimilarity > 85) {
      similarFiles.push({
        filename: doc.filename,
        similarity: finalSimilarity.toFixed(2) + "%", // Show percentage
      });
    }
  }

  return similarFiles.length > 0 ? similarFiles : null;
};

// **File Upload Route with Duplicate Check**
router.post("/upload", authenticateUser, checkCredits, upload.single("file"), async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("--userId: " + userId);

    // Fetch user credits
    db.get("SELECT credits FROM users WHERE id = ?", [userId], async (err, user) => {
      if (err || !user) return res.status(400).json({ message: "User not found!" });

      if (user.credits <= 0) {
        return res.status(400).json({ message: "⚠️ Insufficient credits! Wait for reset or request admin approval." });
      }

      // Deduct credit immediately
      console.log("--------------------start detectingt-")
      db.run("UPDATE users SET credits = credits - 1 WHERE id = ?", [userId], async(updateErr) => {
      console.log("+++++++++++++++");
        if (updateErr) return res.status(500).json({ message: "Error deducting credit" });
      });

      // Ensure file exists
      if (!req.file) return res.status(400).json({ message: "No file uploaded!" });

      const filePath = req.file.path;
      const mimetype = req.file.mimetype;
      const newText = await extractText(filePath, mimetype);

      if (!newText) {
        fs.unlinkSync(filePath); // Cleanup file
        return res.status(400).json({ message: "Could not extract text!" });
      }

      // Check for similar files
      await db.all("SELECT * FROM files", [], (err, storedDocs) => {
        if (err) return res.status(500).json({ message: "Database error", error: err.message });

        const similarFiles = findSimilarFiles(newText, storedDocs);
        if (similarFiles) {
          fs.unlinkSync(filePath);
          return res.status(400).json({ message: "⚠️ Similar files exist!", similarFiles });
        }

        
        db.run("INSERT INTO files (filename, content) VALUES (?, ?)", [req.file.filename, newText],async (err) => {
                      if (err) return res.status(500).json({ message: "Error saving file to database" });
          
                      res.json({ message: "✅ File uploaded successfully!", filePath: `/uploads/${req.file.filename}` });
                    });
        
      });
    });
  } catch (error) {
    res.status(500).json({ message: "File upload failed!", error: error.message });
  }
});


// **Get All Uploaded Documents**
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

