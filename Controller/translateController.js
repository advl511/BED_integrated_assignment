const axios = require("axios");

async function translateText(req, res) {
  const { text, targetLang } = req.body;

  if (!text || !targetLang) {
    return res.status(400).json({ error: "Missing text or target language" });
  }

  try {
    const response = await axios.post("https://libretranslate.de/translate", {
      q: text,
      source: "auto",
      target: targetLang,
      format: "text"
    }, {
      headers: { "Content-Type": "application/json" }
    });

    const translatedText = response.data.translatedText;
    console.log("Translated message:", translatedText);

    res.json({ translatedText });
  } catch (err) {
    console.error("Translation error:", err.message);
    res.status(500).json({ error: "Translation failed" });
  }
}

module.exports = {
  translateText
};
