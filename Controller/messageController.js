const axios = require("axios");
const { sql, config } = require("../db");
const messageModel = require("../Model/messageModel");

// Detect language using multiple methods
async function detectLanguage(text) {
  console.log(`🔍 Detecting language for: "${text}"`);
  
  // First try pattern-based detection (faster and more reliable)
  const englishPattern = /^[a-zA-Z\s.,!?'"()-]+$/;
  const chinesePattern = /[\u4e00-\u9fff]/;
  const japanesePattern = /[\u3040-\u309f\u30a0-\u30ff]/;
  const koreanPattern = /[\uac00-\ud7af]/;
  const arabicPattern = /[\u0600-\u06ff]/;
  const russianPattern = /[\u0400-\u04ff]/;
  
  if (chinesePattern.test(text)) {
    console.log("🇨🇳 Detected Chinese characters");
    return "zh";
  }
  if (japanesePattern.test(text)) {
    console.log("🇯🇵 Detected Japanese characters");
    return "ja";
  }
  if (koreanPattern.test(text)) {
    console.log("🇰🇷 Detected Korean characters");
    return "ko";
  }
  if (arabicPattern.test(text)) {
    console.log("🇸🇦 Detected Arabic characters");
    return "ar";
  }
  if (russianPattern.test(text)) {
    console.log("🇷🇺 Detected Russian characters");
    return "ru";
  }
  if (englishPattern.test(text)) {
    console.log("🇺🇸 Detected English characters");
    return "en";
  }
  
  // If pattern detection fails, try LibreTranslate
  try {
    console.log("🌐 Trying LibreTranslate detection...");
    const response = await axios.post("https://libretranslate.de/detect", {
      q: text
    }, {
      headers: { "Content-Type": "application/json" },
      timeout: 5000
    });
    
    const detectedLang = response.data[0]?.language || "en";
    console.log(`📡 LibreTranslate detected: ${detectedLang}`);
    return detectedLang;
  } catch (err) {
    console.error("❌ LibreTranslate detection failed:", err.message);
    
    // Last resort: if text contains non-ASCII characters, assume it's not English
    const hasNonAscii = /[^\x00-\x7F]/.test(text);
    if (hasNonAscii) {
      console.log("🔤 Contains non-ASCII characters, defaulting to 'zh'");
      return "zh"; // Default to Chinese for non-ASCII
    }
    
    console.log("🔤 Defaulting to English");
    return "en";
  }
}

// Enhanced translation function with detailed logging
async function translateText(text, sourceLang = "auto", targetLang = "en") {
  console.log(`🔄 Starting translation process...`);
  console.log(`📝 Original text: "${text}"`);
  console.log(`🗣️ Source language: ${sourceLang}, Target language: ${targetLang}`);
  
  try {
    // Skip translation if text is empty
    if (!text || text.trim() === "") {
      console.log("❌ Empty text, skipping translation");
      return text;
    }

    const trimmedText = text.trim();
    
    // Detect source language if set to auto
    if (sourceLang === "auto") {
      sourceLang = await detectLanguage(trimmedText);
      console.log(`🔍 Auto-detected source language: ${sourceLang}`);
    }

    // Skip translation if source and target are the same
    if (sourceLang === targetLang) {
      console.log(`⏭️ Source and target languages are the same (${sourceLang}), skipping translation`);
      return trimmedText;
    }

    const langpair = `${sourceLang}|${targetLang}`;
    console.log(`🔀 Using langpair: ${langpair}`);

    const response = await axios.get("https://api.mymemory.translated.net/get", {
      params: {
        q: trimmedText,
        langpair
      },
      timeout: 10000
    });

    console.log("📡 MyMemory API full response:", JSON.stringify(response.data, null, 2));

    if (response.data && response.data.responseData) {
      const translatedText = response.data.responseData.translatedText;
      console.log(`📄 Raw translated text: "${translatedText}"`);
      
      // Check if translation actually occurred
      if (translatedText && translatedText.toLowerCase() !== trimmedText.toLowerCase()) {
        console.log(`✅ Translation successful!`);
        console.log(`🔄 "${trimmedText}" -> "${translatedText}"`);
        return translatedText;
      } else {
        console.log("⚠️ Translation returned same text or empty");
        console.log(`🔄 Trying alternative translation method...`);
        
        // Try with a more specific language code if it was generic
        if (sourceLang === "zh") {
          const altLangpair = `zh-cn|${targetLang}`;
          console.log(`🔄 Trying alternative langpair: ${altLangpair}`);
          
          const altResponse = await axios.get("https://api.mymemory.translated.net/get", {
            params: {
              q: trimmedText,
              langpair: altLangpair
            },
            timeout: 10000
          });
          
          const altTranslatedText = altResponse.data?.responseData?.translatedText;
          if (altTranslatedText && altTranslatedText.toLowerCase() !== trimmedText.toLowerCase()) {
            console.log(`✅ Alternative translation successful: "${altTranslatedText}"`);
            return altTranslatedText;
          }
        }
        
        console.log("⚠️ No translation occurred, returning original text");
        return trimmedText;
      }
    } else {
      console.error("❌ Unexpected API response structure:", response.data);
      return trimmedText;
    }

  } catch (err) {
    console.error("❌ Translation error:", err.message);
    if (err.response) {
      console.error("📡 API Error Response:", err.response.data);
    }
    return text; // Return original text on error
  }
}

// ✅ GET all messages (auto-translated to English)
async function getAllMessages(req, res) {
  const targetLang = "en";

  try {
    const messages = await messageModel.getAllMessages();

    const translatedMessages = await Promise.all(messages.map(async (msg) => {
      if (!msg.content) {
        return { ...msg, translated: msg.content };
      }

      try {
        // Use the enhanced translation function
        const translatedText = await translateText(msg.content, "auto", targetLang);
        
        return { 
          ...msg, 
          translated: translatedText,
          original_content: msg.content // Keep original for reference
        };
      } catch (err) {
        console.error(`Translation failed for message ID ${msg.id}:`, err.message);
        return { 
          ...msg, 
          translated: msg.content, // Fallback to original
          translation_error: true
        };
      }
    }));

    res.json(translatedMessages);
  } catch (err) {
    console.error("Error retrieving messages:", err);
    res.status(500).json({ error: "Error retrieving messages" });
  }
}

// ✅ POST a new message (auto-detect and translate to English)
async function createMessage(req, res) {
  const { sender = "Anonymous", content } = req.body;
  const targetLang = "en";

  if (!content || typeof content !== "string" || content.trim() === "") {
    return res.status(400).json({ error: "Content is required" });
  }

  const trimmedContent = content.trim();

  try {
    // Use the enhanced translation function
    const translatedText = await translateText(trimmedContent, "auto", targetLang);

    // Insert into DB
    const pool = await sql.connect(config);
    await pool.request()
      .input("sender", sql.NVarChar(255), sender.trim())
      .input("content", sql.NVarChar(sql.MAX), trimmedContent)
      .input("translated", sql.NVarChar(sql.MAX), translatedText)
      .query("INSERT INTO Messages (sender, content, translated) VALUES (@sender, @content, @translated)");

    res.status(201).json({ 
      message: "Message saved and translated", 
      original: trimmedContent,
      translated: translatedText,
      translation_occurred: translatedText !== trimmedContent
    });

  } catch (err) {
    console.error("Translation or DB error:", err);
    res.status(500).json({ error: "Failed to save message" });
  }
}

// ✅ PUT update message (with optional re-translation)
async function updateMessage(req, res) {
  const id = parseInt(req.params.id);
  const { content, translated, retranslate = false } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid message ID" });
  }

  try {
    let finalTranslated = translated;
    
    // If content is updated and retranslate is requested
    if (content && retranslate) {
      finalTranslated = await translateText(content, "auto", "en");
    }

    await messageModel.updateMessage(id, content, finalTranslated);
    res.json({ 
      message: "Message updated",
      translated: finalTranslated,
      retranslated: retranslate && content
    });
  } catch (err) {
    console.error("Update message error:", err);
    res.status(500).json({ error: "Error updating message" });
  }
}

// ✅ DELETE message
async function deleteMessage(req, res) {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid message ID" });
  }

  try {
    await messageModel.deleteMessage(id);
    res.json({ message: "Message deleted" });
  } catch (err) {
    console.error("Delete message error:", err);
    res.status(500).json({ error: "Error deleting message" });
  }
}

// ✅ Helper function to test translation with detailed debugging
async function testTranslation(req, res) {
  const { text, sourceLang = "auto", targetLang = "en" } = req.body;
  
  console.log("🧪 TEST TRANSLATION CALLED");
  console.log(`📝 Input text: "${text}"`);
  console.log(`🗣️ Source: ${sourceLang}, Target: ${targetLang}`);
  
  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  try {
    // First, test language detection
    const detectedLang = await detectLanguage(text);
    console.log(`🔍 Detected language: ${detectedLang}`);
    
    // Then test translation
    const translatedText = await translateText(text, sourceLang, targetLang);
    console.log(`📄 Final translated text: "${translatedText}"`);
    
    res.json({
      original: text,
      detected_language: detectedLang,
      translated: translatedText,
      translation_occurred: translatedText !== text,
      same_as_original: translatedText === text
    });
  } catch (err) {
    console.error("❌ Test translation error:", err);
    res.status(500).json({ 
      error: "Translation test failed",
      details: err.message 
    });
  }
}

module.exports = {
  getAllMessages,
  createMessage,
  updateMessage,
  deleteMessage,
  testTranslation
};