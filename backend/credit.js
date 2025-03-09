
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./database.sqlite");

const checkCredits = async (req, res, next) => {
    const userId = req.user.id;
  console.log("Checking credits for user " + userId)
    db.get("SELECT credits, lastReset FROM users WHERE id = ?", [userId], (err, user) => {
      if (err || !user) return res.status(400).json({ message: "User not found!" });
      if (user.credits <= 0) {
        return res.status(400).json({ message: "⚠️ No credits left! Wait for reset or request admin approval." });
      }
  
      next();
    });
  };
 module.exports =checkCredits;
  
  