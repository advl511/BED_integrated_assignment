const { sql, config } = require("../db");

// GET user settings by userId
async function getUserSettings(req, res) {
  const userId = req.params.userId;
  console.log("➡ Getting settings for:", userId);

  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("userId", sql.NVarChar, userId)
      .query("SELECT * FROM Settings WHERE userId = @userId");

    console.log("📦 DB Result:", result.recordset);
    res.json(result.recordset[0] || {});
  } catch (err) {
    console.error("❌ Error fetching settings:", err);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
}

// INSERT user settings (only if new)
async function saveUserSettings(req, res) {
  const userId = req.params.userId;
  const { language, direction, fontSize, timestamps, sound } = req.body;

  try {
    const pool = await sql.connect(config);

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
  } catch (err) {
    console.error("Error saving settings:", err);
    res.status(500).json({ error: "Failed to save settings" });
  }
}

// UPDATE existing user settings
async function updateUserSettings(req, res) {
  const userId = req.params.userId;
  const { language, direction, fontSize, timestamps, sound } = req.body;

  try {
    const pool = await sql.connect(config);

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
  } catch (err) {
    console.error("Error updating settings:", err);
    res.status(500).json({ error: "Failed to update settings" });
  }
}

module.exports = {
  getUserSettings,
  saveUserSettings,
  updateUserSettings,
};
