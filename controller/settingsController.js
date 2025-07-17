const { sql, config } = require("../db");

<<<<<<< HEAD
// GET user settings by userId
async function getUserSettings(req, res) {
  const userId = req.params.userId;
  console.log("➡ Getting settings for:", userId);
=======
// ✅ GET user settings by userId
async function getUserSettings(req, res) {
  const userId = req.params.userId;
  console.log("➡ Getting settings for:", userId); // 👈 log the userId
>>>>>>> 7741fc8165b80f5e35553cbb5e60e8de601a90c1

  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("userId", sql.NVarChar, userId)
      .query("SELECT * FROM Settings WHERE userId = @userId");

<<<<<<< HEAD
    console.log("📦 DB Result:", result.recordset);
=======
    console.log("📦 DB Result:", result.recordset); // 👈 log the result

>>>>>>> 7741fc8165b80f5e35553cbb5e60e8de601a90c1
    res.json(result.recordset[0] || {});
  } catch (err) {
    console.error("❌ Error fetching settings:", err);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
}

<<<<<<< HEAD
// INSERT user settings (only if new)
async function saveUserSettings(req, res) {
=======

// ✅ SAVE or UPDATE user settings (upsert)
async function saveOrUpdateUserSettings(req, res) {
>>>>>>> 7741fc8165b80f5e35553cbb5e60e8de601a90c1
  const userId = req.params.userId;
  const { language, direction, fontSize, timestamps, sound } = req.body;

  try {
    const pool = await sql.connect(config);

<<<<<<< HEAD
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
=======
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
>>>>>>> 7741fc8165b80f5e35553cbb5e60e8de601a90c1
    res.status(500).json({ error: "Failed to save settings" });
  }
}

<<<<<<< HEAD
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
=======
module.exports = {
  getUserSettings,
  saveOrUpdateUserSettings,
>>>>>>> 7741fc8165b80f5e35553cbb5e60e8de601a90c1
};
