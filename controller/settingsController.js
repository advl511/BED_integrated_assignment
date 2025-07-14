const { sql, config } = require("../db");

// ✅ GET user settings by userId
async function getUserSettings(req, res) {
  const userId = req.params.userId;
  console.log("➡ Getting settings for:", userId); // 👈 log the userId

  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("userId", sql.NVarChar, userId)
      .query("SELECT * FROM Settings WHERE userId = @userId");

    console.log("📦 DB Result:", result.recordset); // 👈 log the result

    res.json(result.recordset[0] || {});
  } catch (err) {
    console.error("❌ Error fetching settings:", err);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
}


// ✅ SAVE or UPDATE user settings (upsert)
async function saveOrUpdateUserSettings(req, res) {
  const userId = req.params.userId;
  const { language, direction, fontSize, timestamps, sound } = req.body;

  try {
    const pool = await sql.connect(config);

    // Check if settings already exist for user
    const existing = await pool
      .request()
      .input("userId", sql.NVarChar, userId)
      .query("SELECT COUNT(*) AS count FROM Settings WHERE userId = @userId");

    if (existing.recordset[0].count > 0) {
      // Update
      await pool
        .request()
        .input("userId", sql.NVarChar, userId)
        .input("language", sql.NVarChar, language)
        .input("direction", sql.NVarChar, direction)
        .input("fontSize", sql.NVarChar, fontSize)
        .input("timestamps", sql.Bit, timestamps)
        .input("sound", sql.Bit, sound)
        .query(`
          UPDATE Settings
          SET language = @language,
              direction = @direction,
              fontSize = @fontSize,
              timestamps = @timestamps,
              sound = @sound
          WHERE userId = @userId
        `);
      res.json({ message: "Settings updated" });
    } else {
      // Insert
      await pool
        .request()
        .input("userId", sql.NVarChar, userId)
        .input("language", sql.NVarChar, language)
        .input("direction", sql.NVarChar, direction)
        .input("fontSize", sql.NVarChar, fontSize)
        .input("timestamps", sql.Bit, timestamps)
        .input("sound", sql.Bit, sound)
        .query(`
          INSERT INTO Settings (userId, language, direction, fontSize, timestamps, sound)
          VALUES (@userId, @language, @direction, @fontSize, @timestamps, @sound)
        `);
      res.json({ message: "Settings saved" });
    }
  } catch (err) {
    console.error("Error saving/updating settings:", err);
    res.status(500).json({ error: "Failed to save settings" });
  }
}

module.exports = {
  getUserSettings,
  saveOrUpdateUserSettings,
};
