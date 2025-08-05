const { sql, config } = require("../db");

async function getSettings(userId) {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input("userId", sql.Int, userId)
      .query(`
        SELECT 
          userId,
          language,
          fontSize,
          theme,
          timeFormat,
          createdAt,
          updatedAt
        FROM Settings 
        WHERE userId = @userId
      `);
      
    if (result.recordset.length === 0) {
      // Create default settings if none exist
      const defaultSettings = getDefaultSettings();
      await saveSettings(userId, defaultSettings);
      return defaultSettings;
    }
    
    return result.recordset[0];
  } catch (err) {
    console.error("Database error in getSettings:", err);
    throw new Error("Failed to load settings from database");
  }
}

async function saveSettings(userId, settings) {
  const { language, fontSize, theme, timeFormat } = settings;
  
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input("userId", sql.Int, userId)
      .input("language", sql.VarChar(10), language)
      .input("fontSize", sql.VarChar(10), fontSize)
      .input("theme", sql.VarChar(10), theme)
      .input("timeFormat", sql.VarChar(10), timeFormat)
      .query(`
        MERGE INTO Settings WITH (HOLDLOCK) AS target
        USING (VALUES (@userId, @language, @fontSize, @theme, @timeFormat)) 
          AS source (userId, language, fontSize, theme, timeFormat)
        ON target.userId = source.userId
        WHEN MATCHED THEN
          UPDATE SET 
            language = source.language,
            fontSize = source.fontSize,
            theme = source.theme,
            timeFormat = source.timeFormat,
            updatedAt = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (userId, language, fontSize, theme, timeFormat, createdAt, updatedAt)
          VALUES (source.userId, source.language, source.fontSize, source.theme, source.timeFormat, GETDATE(), GETDATE());
        SELECT * FROM Settings WHERE userId = @userId;
      `);
      
    return result.recordset[0];
  } catch (err) {
    console.error("Database error in saveSettings:", err);
    throw new Error("Failed to save settings to database");
  }
}

function getDefaultSettings() {
  return {
    language: 'en',
    fontSize: 'medium',
    theme: 'light',
    timeFormat: '24h',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

module.exports = { getSettings, saveSettings };