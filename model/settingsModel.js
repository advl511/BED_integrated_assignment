const { sql, config } = require("../db");

async function saveSettings(userId, settings) {
  const pool = await sql.connect(config);
  await pool.request()
    .input("userId", sql.Int, userId)
    .input("language", sql.VarChar(10), settings.language)
    .input("direction", sql.VarChar(20), settings.direction)
    .input("fontSize", sql.VarChar(10), settings.fontSize)
    .input("timestamps", sql.Bit, settings.timestamps)
    .input("sound", sql.Bit, settings.sound)
    .query(`
      MERGE INTO UserSettings AS target
      USING (SELECT @userId AS userId) AS source
      ON target.userId = source.userId
      WHEN MATCHED THEN
        UPDATE SET
          language = @language,
          direction = @direction,
          fontSize = @fontSize,
          timestamps = @timestamps,
          sound = @sound
      WHEN NOT MATCHED THEN
        INSERT (userId, language, direction, fontSize, timestamps, sound)
        VALUES (@userId, @language, @direction, @fontSize, @timestamps, @sound);
    `);
}

async function getSettings(userId) {
  const pool = await sql.connect(config);
  const result = await pool.request()
    .input("userId", sql.Int, userId)
    .query("SELECT * FROM UserSettings WHERE userId = @userId");
  return result.recordset[0];
}

module.exports = { saveSettings, getSettings };
