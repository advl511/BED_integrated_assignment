const { sql } = require("../db");

async function saveTranslation(originalText, translatedText, sourceLang, targetLang) {
  await sql.query`
  INSERT INTO TranslationHistory (originalText, translatedText, sourceLang, targetLang)
  VALUES (${originalText}, ${translatedText}, ${sourceLang}, ${targetLang})`;
}


async function getAllTranslations() {
  const result = await sql.query`SELECT * FROM TranslationHistory ORDER BY translatedAt DESC`;
  return result.recordset;
}

async function getTranslationById(id) {
  const result = await sql.query`SELECT * FROM TranslationHistory WHERE id = ${id}`;
  return result.recordset[0];
}

async function updateTranslation(id, newText) {
  const result = await sql.query`
    UPDATE TranslationHistory SET translatedText = ${newText}, translatedAt = GETDATE() WHERE id = ${id}
  `;
  return result.rowsAffected[0] > 0;
}

async function deleteTranslation(id) {
  const result = await sql.query`DELETE FROM TranslationHistory WHERE id = ${id}`;
  return result.rowsAffected[0] > 0;
}


module.exports = {
  saveTranslation,
  getAllTranslations,
  getTranslationById,
  updateTranslation,
  deleteTranslation
};
