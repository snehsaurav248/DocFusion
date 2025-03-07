const cron = require("node-cron");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./database.sqlite");

cron.schedule("50 0 * * *",async () => {
  console.log("🔄 Resetting user credits...");
  db.run("UPDATE users SET credits = 20, lastReset = datetime('now')", (err) => {
    if (err) console.error("❌ Cron job failed:", err.message);
    else console.log("✅ User credits reset successfully.");
  });
});

