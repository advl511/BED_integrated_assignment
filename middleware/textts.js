const express = require("express");
const axios = require("axios");
const router = express.Router();
const translationController = require("../controllers/translationController");
const historyModel = require("../models/translationModel");

// Main translation route using direct LibreTranslate
router.post('/translate', async (req, res) => {
  const { text, from, to } = req.body;

  // Input validation
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return res.status(400).json({ error: "Text is required and must be a non-empty string" });
  }

  if (!from || typeof from !== 'string') {
    return res.status(400).json({ error: "Source language (from) is required" });
  }

  if (!to || typeof to !== 'string') {
    return res.status(400).json({ error: "Target language (to) is required" });
  }

  try {
    const trimmedText = text.trim();
    console.log(`🔄 Translating: "${trimmedText}" from ${from} to ${to}`);

    // Skip translation if source and target are the same
    if (from === to) {
      console.log(`⏭️ Source and target languages are the same, skipping translation`);
      return res.json({ 
        translated: trimmedText,
        original: trimmedText,
        from: from,
        to: to,
        skipped: true
      });
    }

    const result = await axios.post("https://libretranslate.de/translate", {
      q: trimmedText,
      source: from,
      target: to,
      format: "text"
    }, {
      headers: { "Content-Type": "application/json" },
      timeout: 10000
    });

    if (!result.data || !result.data.translatedText) {
      throw new Error("Invalid response from LibreTranslate");
    }

    const translatedText = result.data.translatedText;
    console.log(`✅ Translation successful: "${translatedText}"`);

    // Save to database (don't block the response)
    historyModel.saveTranslation(trimmedText, translatedText, from, to)
      .catch(dbErr => {
        console.error("❌ Failed to save translation to database:", dbErr.message);
      });

    res.json({ 
      translated: translatedText,
      original: trimmedText,
      from: from,
      to: to,
      service: "LibreTranslate"
    });

  } catch (err) {
    console.error("❌ Translation failed:", err.response?.data || err.message);
    
    // Handle specific error cases
    if (err.code === 'ECONNABORTED') {
      return res.status(504).json({ error: "Translation service timeout" });
    }
    
    if (err.response?.status === 400) {
      return res.status(400).json({ 
        error: "Invalid request - check language codes and text format" 
      });
    }
    
    if (err.response?.status === 429) {
      return res.status(429).json({ error: "Rate limit exceeded - please try again later" });
    }

    if (err.response?.status === 503) {
      return res.status(503).json({ error: "Translation service temporarily unavailable" });
    }
    
    res.status(500).json({ 
      error: "Translation failed",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Use controller for advanced translation with multiple fallbacks
router.post('/translate-advanced', translationController.createTranslation);

// History management routes
router.get('/translations', translationController.getAllTranslations);
router.get('/translations/:id', translationController.getTranslationById);
router.put('/translations/:id', translationController.updateTranslation);
router.delete('/translations/:id', translationController.deleteTranslation);

// Utility routes
router.post('/test-translate', translationController.testTranslation);
router.get('/languages', translationController.getSupportedLanguages);

module.exports = router;