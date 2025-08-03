const axios = require("axios");

async function translateText(text, from, to) {
  const res = await axios.post("https://libretranslate.de/translate", {
    q: text,
    source: from,
    target: to,
    format: "text"
  });
  return res.data.translatedText;
}

module.exports = { translateText };
