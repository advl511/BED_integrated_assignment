// middlewares/validateTTS.js
function validateTTSRequest(req, res, next) {
  const { text, from, to } = req.body;

  if (!text || !from || !to) {
    return res.status(400).json({ error: "Missing text, source or target language." });
  }

  if (typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({ error: "Text must be a non-empty string." });
  }

  next();
}

module.exports = validateTTSRequest;
