// const fs = require("fs");
// const pdfParse = require("pdf-parse");
// const textract = require("textract");
// const levenshtein = require("fast-levenshtein");
// const sqlite3 = require("sqlite3").verbose();

// // Connect to SQLite Database
// const db = new sqlite3.Database("./database.sqlite", (err) => {
//     if (err) console.error("❌ DB connection failed:", err.message);
//     else console.log("✅ Connected to SQLite database.");
// });

// // Ensure table exists
// db.run(`CREATE TABLE IF NOT EXISTS files (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     filename TEXT NOT NULL,
//     content TEXT NOT NULL
// )`, (err) => {
//     if (err) console.error("❌ Table creation failed:", err.message);
//     else console.log("✅ Table 'files' is ready.");
// });

// // Function to extract text from files
// const extractText = async (filePath, mimetype) => {
//     return new Promise((resolve, reject) => {
//         if (mimetype === "application/pdf") {
//             pdfParse(fs.readFileSync(filePath))
//                 .then(data => resolve(data.text))
//                 .catch(err => reject(err));
//         } else {
//             textract.fromFileWithPath(filePath, (err, text) => {
//                 if (err) reject(err);
//                 resolve(text);
//             });
//         }
//     });
// };

// // Function to compute word frequency
// const wordFrequency = (text) => {
//     const words = text.toLowerCase().match(/\b\w+\b/g) || [];
//     const freq = {};
//     words.forEach(word => freq[word] = (freq[word] || 0) + 1);
//     return freq;
// };

// // Function to check for duplicate files
// const isDuplicate = (newText, storedDocs) => {
//     const newFreq = wordFrequency(newText);

//     for (const doc of storedDocs) {
//         const storedFreq = wordFrequency(doc.content);
//         const levenshteinDist = levenshtein.get(newText, doc.content);
//         const similarity = 1 - (levenshteinDist / Math.max(newText.length, doc.content.length));

//         let commonWords = 0;
//         for (const word in newFreq) {
//             if (storedFreq[word]) commonWords++;
//         }
//         const wordSim = commonWords / Object.keys(newFreq).length;

//         if (similarity > 0.85 || wordSim > 0.85) {
//             return true; // Duplicate found
//         }
//     }
//     return false;
// };

// // Middleware to check duplicate file
// const checkDuplicateFile = async (req, res, next) => {
//     try {
//         if (!req.file) return res.status(400).json({ message: "No file uploaded!" });

//         const filePath = req.file.path;
//         const mimetype = req.file.mimetype;

//         console.log("🚀 Upload process started...");
//         console.log(`📂 File Path: ${filePath}, MIME Type: ${mimetype}`);

//         const newText = await extractText(filePath, mimetype);
//         if (!newText) {
//             fs.unlinkSync(filePath);
//             return res.status(400).json({ message: "❌ Could not extract text!" });
//         }

//         const storedDocs = await getStoredFiles();

//         if (isDuplicate(newText, storedDocs)) {
//             fs.unlinkSync(filePath);
//             console.warn("⚠️ Duplicate file detected. Upload rejected.");
//             return res.status(400).json({ message: "❌ Same file already exists!" });
//         }

//         db.run("INSERT INTO files (filename, content) VALUES (?, ?)", [req.file.filename, newText], (err) => {
//             if (err) {
//                 fs.unlinkSync(filePath);
//                 return res.status(500).json({ message: "❌ Error saving file to database" });
//             }
//             console.log("✅ File saved successfully!");
//             next();
//         });

//     } catch (error) {
//         fs.unlinkSync(req.file.path);
//         return res.status(500).json({ message: "❌ Error checking duplicate file", error: error.message });
//     }
// };

// module.exports = checkDuplicateFile;
