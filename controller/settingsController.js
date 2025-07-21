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

// UPSERT user settings (insert if not exists, else update)
async function upsertUserSettings(req, res) {
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
        MERGE INTO Settings AS target
        USING (SELECT @userId AS userId) AS source
        ON (target.userId = source.userId)
        WHEN MATCHED THEN 
          UPDATE SET language = @language,
                     direction = @direction,
                     fontSize = @fontSize,
                     timestamps = @timestamps,
                     sound = @sound
        WHEN NOT MATCHED THEN
          INSERT (userId, language, direction, fontSize, timestamps, sound)
          VALUES (@userId, @language, @direction, @fontSize, @timestamps, @sound);
      `);

    res.json({ message: "Settings saved or updated" });
  } catch (err) {
    console.error("Error upserting settings:", err);
    res.status(500).json({ error: "Failed to save or update settings" });
  }
}

module.exports = {
  getUserSettings,
  upsertUserSettings,
};
