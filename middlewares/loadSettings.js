const { sql, config } = require("../db");

async function loadSettings(req, res, next) {
  try {
    const userId = req.user?.id || 1; // Change this if you're using JWT auth
    const pool = await sql.connect(config);

    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query("SELECT * FROM Settings WHERE userId = @userId");

    req.settings = result.recordset[0] || {};
    next();
  } catch (err) {
    console.error("Failed to load settings:", err.message);
    req.settings = {}; // fallback to empty
    next(); // still proceed
  }
}

module.exports = loadSettings;
