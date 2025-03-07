const cron = require("node-cron");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./database.sqlite");

cron.schedule("0 0 * * *", async () => {
  console.log("🔄 Resetting user credits and global counter...");

  // Resetting user credits to 20 and updating the last reset time
  db.run("UPDATE users SET credits = 20, lastReset = datetime('now')", (err) => {
    if (err) {
      console.error("❌ Cron job failed (resetting credits):", err.message);
    } else {
      console.log("✅ User credits reset successfully.");
    }
  });

  globalCounter = 0; // Assuming globalCounter is declared globally in the server.js
  console.log("✅ Global counter reset at midnight.");
});
