const cron = require("node-cron");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./database.sqlite");

cron.schedule("0 0 * * *", async () => {
  console.log("🔄 Resetting user credits and global counter...");

  
  db.run("UPDATE users SET credits = 20, lastReset = datetime('now')", (err) => {
    if (err) {
      console.error("❌ Cron job failed (resetting credits):", err.message);
    } else {
      console.log("✅ User credits reset successfully.");
    }
  });

  globalCounter = 0; 
  console.log("✅ Global counter reset at midnight.");
});
