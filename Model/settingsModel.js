const { sql, config } = require("../db");

async function saveSettings(userId, settings) {
  const pool = await sql.connect(config);
  await pool.request()
    .input("userId", sql.Int, userId)
    .input("language", sql.NVarChar(50), settings.language || null)
    .input("direction", sql.NVarChar(50), settings.direction || null)
    .input("fontSize", sql.NVarChar(50), settings.fontSize || null)
    .input("timestamps", sql.Bit, settings.timestamps === undefined ? null : settings.timestamps)
    .input("sound", sql.Bit, settings.sound === undefined ? null : settings.sound)
    .input("theme", sql.NVarChar(50), settings.theme || null)
    .input("timeFormat", sql.NVarChar(50), settings.timeFormat || null)
    .query(`
      MERGE INTO Settings AS target
      USING (SELECT @userId AS userId) AS source
      ON target.userId = source.userId
      WHEN MATCHED THEN
        UPDATE SET
          language = @language,
          direction = @direction,
          fontSize = @fontSize,
          timestamps = @timestamps,
          sound = @sound,
          theme = @theme,
          timeFormat = @timeFormat
      WHEN NOT MATCHED THEN
        INSERT (userId, language, direction, fontSize, timestamps, sound, theme, timeFormat)
        VALUES (@userId, @language, @direction, @fontSize, @timestamps, @sound, @theme, @timeFormat);
    `);
}




async function getSettings(userId) {
  const pool = await sql.connect(config);
  const result = await pool.request()
    .input("userId", sql.Int, userId)
    .query("SELECT * FROM Settings WHERE userId = @userId");
  return result.recordset[0];
}

module.exports = { saveSettings, getSettings };
