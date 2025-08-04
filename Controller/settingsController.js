const { getSettings, saveSettings } = require("../Model/settingsModel");

async function getUserSettings(req, res) {
  const userIdRaw = parseInt(req.params.userId || req.user?.id || 1);
  const userId = parseInt(userIdRaw, 10);
  if (isNaN(userId)) {
    return res.status(400).json({ error: "Invalid userId" });
  }
  try {
    const settings = await getSettings(userId);
    res.json(settings || {});
  } catch (err) {
    console.error("Error fetching settings:", err);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
}

async function upsertUserSettings(req, res) {
  const userId = parseInt(req.params.userId || req.user?.id || 1);
  const settings = req.body;
  try {
    await saveSettings(userId, settings);
    res.json({ message: "Settings saved or updated" });
  } catch (err) {
    console.error("Error saving settings:", err);
    res.status(500).json({ error: "Failed to save or update settings" });
  }
}

module.exports = { getUserSettings, upsertUserSettings, };
