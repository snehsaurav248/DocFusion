
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./database.sqlite");

const checkCredits = async (req, res, next) => {
    const userId = req.user.id;
  
    db.get("SELECT credits, lastReset FROM users WHERE id = ?", [userId], (err, user) => {
      if (err || !user) return res.status(400).json({ message: "User not found!" });
  
      const currentTime = new Date();
      const lastResetTime = new Date(user.lastReset);
      
    //  if (currentTime.toDateString() !== lastResetTime.toDateString()) {
    //     // Reset credits if a new day
    //     db.run("UPDATE users SET credits = 20, lastReset = datetime('now') WHERE id = ?", [userId]);
    //     user.credits = 20;
    //   }
  
      if (user.credits <= 0) {
        return res.status(400).json({ message: "⚠️ No credits left! Wait for reset or request admin approval." });
      }
  
      next();
    });
  };
 module.exports =checkCredits;
  
  