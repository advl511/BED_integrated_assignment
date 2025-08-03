const express = require("express");
const router = express.Router();

console.log("🔧 Settings router loaded");

// In-memory storage for now (replace with database later)
const userSettings = {};

// GET settings for a specific user
router.get("/:userId", async (req, res) => {
  console.log(`📥 GET /api/settings/${req.params.userId} - Request received`);
  try {
    const userId = req.params.userId;
    
    // Get stored settings or use defaults
    const settings = userSettings[userId] || {
      language: "en",
      fontSize: "medium", 
      theme: "light",
      timeFormat: "12h"
    };
    
    console.log(`📤 Sending settings for user ${userId}:`, settings);
    res.json(settings);
  } catch (error) {
    console.error("❌ Error loading settings:", error);
    res.status(500).json({ error: "Failed to load settings" });
  }
});

// POST settings for a specific user
router.post("/:userId", async (req, res) => {
  console.log(`📥 POST /api/settings/${req.params.userId} - Request received`);
  console.log(`📥 Request body:`, req.body);
  try {
    const userId = req.params.userId;
    const settings = req.body;
    
    // Store settings in memory (replace with database save later)
    userSettings[userId] = settings;
    
    console.log(`💾 Settings saved for user ${userId}:`, settings);
    console.log(`💾 All stored settings:`, userSettings);
    
    res.json({ success: true, message: "Settings saved successfully" });
  } catch (error) {
    console.error("❌ Error saving settings:", error);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

console.log("🔧 Settings router configured");
module.exports = router;