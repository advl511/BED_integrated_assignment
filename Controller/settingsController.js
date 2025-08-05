const { saveSettings } = require('../Model/settingsModel'); // Verify this path

async function handleSaveSettings(req, res) {
  try {
    const userId = parseInt(req.params.userId);
    const { language, fontSize, theme, timeFormat } = req.body;

    if (!userId || !language || !fontSize || !theme || !timeFormat) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await saveSettings(userId, { language, fontSize, theme, timeFormat });
    res.json({ success: true, message: "Settings saved" });
    
  } catch (err) {
    console.error("Error in handleSaveSettings:", err);
    res.status(500).json({ 
      error: "Failed to save settings",
      details: err.message 
    });
  }
}

module.exports = { 
  handleSaveSettings 
};