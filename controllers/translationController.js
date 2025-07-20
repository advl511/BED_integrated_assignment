const axios = require("axios");
const { sql, config } = require("../db");
const translationModel = require("../models/translationModel");

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
  const spanishPattern = /[ñáéíóúü]/i;
  const frenchPattern = /[àâäéèêëïîôöùûüÿç]/i;
  const germanPattern = /[äöüß]/i;
  
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
  if (spanishPattern.test(text)) {
    console.log("🇪🇸 Detected Spanish characters");
    return "es";
  }
  if (frenchPattern.test(text)) {
    console.log("🇫🇷 Detected French characters");
    return "fr";
  }
  if (germanPattern.test(text)) {
    console.log("🇩🇪 Detected German characters");
    return "de";
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
    console.error("LibreTranslate detection failed:", err.message);
    
    // Last resort: if text contains non-ASCII characters, assume it's not English
    const hasNonAscii = /[^\x00-\x7F]/.test(text);
    if (hasNonAscii) {
      console.log("🔤 Contains non-ASCII characters, defaulting to 'auto'");
      return "auto";
    }
    
    console.log("🔤 Defaulting to English");
    return "en";
  }
}

// Enhanced translation function with detailed logging and multiple fallbacks
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
    console.log(`Using langpair: ${langpair}`);

    const response = await axios.get("https://api.mymemory.translated.net/get", {
      params: {
        q: trimmedText,
        langpair
    },
    timeout: 10000 
    });

    console.log("📡 MyMemory API response:", JSON.stringify(response.data, null, 2));
    if (response.data && response.data.responseData) {
      const translatedText = response.data.responseData.translatedText;
      
      // Check if translation is valid
      if (translatedText && translatedText.toLowerCase() !== trimmedText.toLowerCase()) {
        console.log(`✅ MyMemory translation successful: "${translatedText}"`);
        
        // Save to database (don't block the response)
        translationModel.saveTranslation(trimmedText, translatedText, sourceLang, targetLang)
          .catch(dbErr => {
            console.error("❌ Failed to save translation to database:", dbErr.message);
          });

        return translatedText;
      } else {
        console.log("⚠️ MyMemory returned same text or empty, trying LibreTranslate...");
      }
    } else {
      console.error("❌ Invalid MyMemory response structure");
    }
    // Try multiple translation services in order
    const translationServices = [
      { name: 'MyMemory', func: translateWithMyMemory },
      { name: 'LibreTranslate', func: translateWithLibreTranslate },
      { name: 'GoogleTranslate', func: translateWithGoogleTranslate }
    ];

    for (const service of translationServices) {
      try {
        console.log(`🔄 Trying ${service.name}...`);
        const result = await service.func(trimmedText, sourceLang, targetLang);
        
        if (result && result.toLowerCase() !== trimmedText.toLowerCase()) {
          console.log(`✅ ${service.name} translation successful!`);
          console.log(`🔄 "${trimmedText}" -> "${result}"`);
          return result;
        } else {
          console.log(`⚠️ ${service.name} returned same text or empty`);
          continue;
        }
      } catch (err) {
        console.error(`❌ ${service.name} failed:`, err.message);
        continue;
      }
    }

    console.log("⚠️ All translation services failed, returning original text");
    return trimmedText;

  } catch (err) {
    console.error("❌ Translation error:", err.message);
    return text; // Return original text on error
  }
}

// MyMemory translation service
async function translateWithMyMemory(text, sourceLang, targetLang) {
  const langpair = `${sourceLang}|${targetLang}`;
  console.log(`🔀 MyMemory using langpair: ${langpair}`);

  const response = await axios.get("https://api.mymemory.translated.net/get", {
    params: {
      q: text,
      langpair
    },
    timeout: 10000
  });

  console.log("📡 MyMemory API response:", JSON.stringify(response.data, null, 2));

  if (response.data && response.data.responseData) {
    const translatedText = response.data.responseData.translatedText;
    
    // Try alternative language codes if first attempt fails
    if (!translatedText || translatedText.toLowerCase() === text.toLowerCase()) {
      if (sourceLang === "zh") {
        const altLangpair = `zh-cn|${targetLang}`;
        console.log(`🔄 Trying alternative langpair: ${altLangpair}`);
        
        const altResponse = await axios.get("https://api.mymemory.translated.net/get", {
          params: {
            q: text,
            langpair: altLangpair
          },
          timeout: 10000
        });
        
        return altResponse.data?.responseData?.translatedText;
      }
    }
    
    return translatedText;
  }
  
  throw new Error("Invalid MyMemory response structure");
}

// LibreTranslate translation service
async function translateWithLibreTranslate(text, sourceLang, targetLang) {
  console.log(`🔄 LibreTranslate translating from ${sourceLang} to ${targetLang}`);

  const response = await axios.post("https://libretranslate.de/translate", {
    q: text,
    source: sourceLang,
    target: targetLang,
    format: "text"
  }, {
    headers: { "Content-Type": "application/json" },
    timeout: 10000
  });

  console.log("📡 LibreTranslate response:", JSON.stringify(response.data, null, 2));

  if (response.data && response.data.translatedText) {
    return response.data.translatedText;
  }
  
  throw new Error("Invalid LibreTranslate response structure");
}

// Google Translate fallback (if you have API key)
async function translateWithGoogleTranslate(text, sourceLang, targetLang) {
  if (!process.env.GOOGLE_TRANSLATE_API_KEY) {
    throw new Error("Google Translate API key not configured");
  }

  console.log(`🔄 Google Translate translating from ${sourceLang} to ${targetLang}`);

  const response = await axios.post("https://translation.googleapis.com/language/translate/v2", {
    q: text,
    source: sourceLang,
    target: targetLang,
    key: process.env.GOOGLE_TRANSLATE_API_KEY
  }, {
    headers: { "Content-Type": "application/json" },
    timeout: 10000
  });

  console.log("📡 Google Translate response:", JSON.stringify(response.data, null, 2));

  if (response.data && response.data.data && response.data.data.translations) {
    return response.data.data.translations[0].translatedText;
  }
  
  throw new Error("Invalid Google Translate response structure");
}

// ✅ GET all translations
async function getAllTranslations(req, res) {
  try {
    const translations = await translationModel.getAllTranslations();
    res.json(translations);
  } catch (err) {
    console.error("Error retrieving translations:", err);
    res.status(500).json({ error: "Error retrieving translations" });
  }
}

// ✅ POST create new translation (auto-detect source language)
async function createTranslation(req, res) {
  const originalText = req.body.originalText || req.body.text;
  const sourceLang = req.body.sourceLang || req.body.from || "auto";
  const targetLang = req.body.targetLang || req.body.to;

  if (!originalText || !targetLang) {
    return res.status(400).json({ error: "Original text and target language are required" });
  }

  if (!targetLang || typeof targetLang !== "string") {
    return res.status(400).json({ error: "Target language is required" });
  }

  const trimmedOriginal = originalText.trim();

  try {
    console.log(`🔄 Creating translation for: "${trimmedOriginal}"`);
    
    // Detect source language if auto
    let detectedSourceLang = sourceLang;
    if (sourceLang === "auto") {
      detectedSourceLang = await detectLanguage(trimmedOriginal);
      console.log(`🔍 Auto-detected source language: ${detectedSourceLang}`);
    }

    // Perform translation
    const translatedText = await translateText(trimmedOriginal, detectedSourceLang, targetLang);

    // Save to database
    await translationModel.saveTranslation(trimmedOriginal, translatedText, detectedSourceLang, targetLang);

    res.status(201).json({
      message: "Translation created successfully",
      original: trimmedOriginal,
      translated: translatedText,
      sourceLang: detectedSourceLang,
      targetLang: targetLang,
      translation_occurred: translatedText !== trimmedOriginal
    });

  } catch (err) {
    console.error("Translation or DB error:", err);
    res.status(500).json({ 
      error: "Failed to create translation",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}

// ✅ GET translation by ID
async function getTranslationById(req, res) {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid translation ID" });
  }

  try {
    const translation = await translationModel.getTranslationById(id);
    
    if (translation) {
      res.json(translation);
    } else {
      res.status(404).json({ error: "Translation not found" });
    }
  } catch (err) {
    console.error("Error fetching translation:", err);
    res.status(500).json({ error: "Error fetching translation" });
  }
}

// ✅ PUT update translation (with optional re-translation)
async function updateTranslation(req, res) {
  const id = parseInt(req.params.id);
  const { originalText, translatedText, sourceLang, targetLang, retranslate = false } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid translation ID" });
  }

  try {
    let finalTranslatedText = translatedText;
    
    // If original text is updated and retranslate is requested
    if (originalText && retranslate) {
      console.log(`🔄 Re-translating: "${originalText}"`);
      
      let detectedSourceLang = sourceLang || "auto";
      if (detectedSourceLang === "auto") {
        detectedSourceLang = await detectLanguage(originalText);
      }
      
      finalTranslatedText = await translateText(originalText, detectedSourceLang, targetLang || "en");
    }

    // Update in database
    const result = await translationModel.updateTranslation(id, finalTranslatedText);
    
    if (result) {
      res.json({
        message: "Translation updated successfully",
        translated: finalTranslatedText,
        retranslated: retranslate && originalText
      });
    } else {
      res.status(404).json({ error: "Translation not found" });
    }
  } catch (err) {
    console.error("Update translation error:", err);
    res.status(500).json({ error: "Error updating translation" });
  }
}

// ✅ DELETE translation
async function deleteTranslation(req, res) {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid translation ID" });
  }

  try {
    const result = await translationModel.deleteTranslation(id);
    
    if (result) {
      res.json({ message: "Translation deleted successfully" });
    } else {
      res.status(404).json({ error: "Translation not found" });
    }
  } catch (err) {
    console.error("Delete translation error:", err);
    res.status(500).json({ error: "Error deleting translation" });
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
      same_as_original: translatedText === text,
      source_language: sourceLang === "auto" ? detectedLang : sourceLang,
      target_language: targetLang
    });
  } catch (err) {
    console.error("❌ Test translation error:", err);
    res.status(500).json({ 
      error: "Translation test failed",
      details: err.message 
    });
  }
}

// ✅ Helper function to get supported languages
async function getSupportedLanguages(req, res) {
  try {
    const languages = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'th': 'Thai',
      'vi': 'Vietnamese',
      'nl': 'Dutch',
      'sv': 'Swedish',
      'no': 'Norwegian',
      'da': 'Danish',
      'fi': 'Finnish',
      'pl': 'Polish',
      'cs': 'Czech',
      'hu': 'Hungarian',
      'ro': 'Romanian',
      'bg': 'Bulgarian',
      'tr': 'Turkish',
      'he': 'Hebrew',
      'fa': 'Persian',
      'ur': 'Urdu',
      'bn': 'Bengali',
      'ta': 'Tamil',
      'te': 'Telugu',
      'ml': 'Malayalam',
      'kn': 'Kannada',
      'gu': 'Gujarati',
      'pa': 'Punjabi',
      'si': 'Sinhala',
      'my': 'Myanmar',
      'km': 'Khmer',
      'lo': 'Lao',
      'ka': 'Georgian',
      'am': 'Amharic',
      'sw': 'Swahili',
      'zu': 'Zulu',
      'af': 'Afrikaans',
      'eu': 'Basque',
      'ca': 'Catalan',
      'gl': 'Galician',
      'id': 'Indonesian',
      'ms': 'Malay',
      'tl': 'Filipino',
      'auto': 'Auto-detect'
    };

    res.json({
      message: "Supported languages retrieved successfully",
      languages: languages,
      total_languages: Object.keys(languages).length
    });
  } catch (err) {
    console.error("Error getting supported languages:", err);
    res.status(500).json({ error: "Error retrieving supported languages" });
  }
}

module.exports = {
  createTranslation,
  getAllTranslations,
  getTranslationById,
  updateTranslation,
  deleteTranslation,
  testTranslation,
  getSupportedLanguages,
  translateText
};