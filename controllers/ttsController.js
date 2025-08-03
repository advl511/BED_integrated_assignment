const { translateText } = require("../models/ttsModel");
const historyModel = require("../models/translationModel");

async function handleTranslation(req, res) {
  try {
    const { text, from, to } = req.body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Missing or invalid text parameter." });
    }
    if (!from || typeof from !== "string") {
      return res.status(400).json({ error: "Missing or invalid source language parameter." });
    }
    if (!to || typeof to !== "string") {
      return res.status(400).json({ error: "Missing or invalid target language parameter." });
    }

    // Skip translation if languages are the same
    if (from === to) {
      return res.json({ translated: text, original: text, from, to, translation_occurred: false });
    }

    const translated = await translateText(text, from, to);

    // Save to DB async
    historyModel.saveTranslation(text, translated, from, to).catch((err) =>
      console.error("Failed to save translation:", err)
    );

    res.json({ translated, original: text, from, to, translation_occurred: translated !== text });
  } catch (err) {
    console.error("Translation error:", err);
    res.status(500).json({ error: "Translation failed." });
  }
}

module.exports = { handleTranslation };