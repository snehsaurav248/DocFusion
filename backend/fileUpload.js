const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const sqlite3 = require("sqlite3").verbose();
const levenshtein = require("fast-levenshtein");
// const {checkDuplicateFile,isDuplicate} = require("./middleware/checkDuplicate.js");

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

// router.post(
//     "/upload",
//     upload.single("file"),
//     async (req, res) => {
//         try {
//             console.log("Upload process started...");

//             if (!req.file) {
//                 return res.status(400).json({ message: "No file uploaded!" });
//             }

//             const filePath = req.file.path;
//             const mimetype = req.file.mimetype;
//             console.log("File Path:", filePath, "MIME Type:", mimetype);

//             // Extract text (only for PDF & TXT)
//             let extractedText = await extractText(filePath, mimetype);
//             console.log("Extracted Text:", extractedText);
//             // If file is an image, store it without text content
//             if (!extractedText && (mimetype === "image/jpeg" || mimetype === "image/png")) {
//                 extractedText = "Image file - No text extraction needed";
//             } else if (!extractedText) {
//                 return res.status(400).json({ message: "Unsupported file type for text extraction!" });
//             }

//             db.run(
//                 "INSERT INTO files (filename, content) VALUES (?, ?)",
//                 [req.file.filename, extractedText],
//                 function (err) {
//                     if (err) {
//                         console.error("Database Insertion Error:", err.message);
//                         return res.status(500).json({ message: "Error saving file to database", error: err.message });
//                     }

//                     res.json({
//                         message: "✅ File uploaded successfully!",
//                         filePath: `/uploads/${req.file.filename}`,
//                     });
//                 }
//             );

//         } catch (error) {
//             console.error("Error:", error.message);
//             res.status(500).json({ message: "File upload failed!", error: error.message });
//         }
//     }
// );
const wordFrequency = (text) => {
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const freq = {};
  words.forEach((word) => (freq[word] = (freq[word] || 0) + 1));
  return freq;
};
const isDuplicate = (newText, storedDocs) => {
  const newFreq = wordFrequency(newText);

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
      return true; // Duplicate found
    }
  }
  return false;
};

// **1️⃣ Updated File Upload Route with Duplicate Check**
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded!" });
    }

    const filePath = req.file.path;
    const mimetype = req.file.mimetype;
    const newText = await extractText(filePath, mimetype);
    console.log("=====================" + newText);
    if (!newText) {
      return res.status(400).json({ message: "Could not extract text!" });
    }

    // Fetch existing documents
    db.all("SELECT * FROM files", [], (err, storedDocs) => {
      if (err)
        return res
          .status(500)
          .json({ message: "Database error", error: err.message });

      if (isDuplicate(newText, storedDocs)) {
        fs.unlinkSync(filePath); // Delete uploaded file
        return res
          .status(400)
          .json({ message: "Same file exists!", file: storedDocs });
      }

      // Store new document
      db.run(
        "INSERT INTO files (filename, content) VALUES (?, ?)",
        [req.file.filename, newText],
        (err) => {
          if (err)
            return res
              .status(500)
              .json({ message: "Error saving file to database" });

          res.json({
            message: "✅ File uploaded successfully!",
            filePath: `/uploads/${req.file.filename}`,
          });
        }
      );
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "File upload failed!", error: error.message });
  }
});

// **2️⃣ Get All Uploaded Documents Route**
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
