document.addEventListener("DOMContentLoaded", () => {
  const fromLang = document.getElementById("fromLang");
  const toLang = document.getElementById("toLang");
  const inputText = document.getElementById("inputText");
  const translateBtn = document.getElementById("translateBtn");
  const outputBox = document.getElementById("outputBox");
  const translatedText = document.getElementById("translatedText");
  const playBtn = document.getElementById("playBtn");
  const swapBtn = document.getElementById("swapBtn");

  

  translateBtn.addEventListener("click", async () => {
    const text = inputText.value.trim();
    const from = fromLang.value;
    const to = toLang.value;

    
    if (!text) {
      alert("Please enter some text to translate.");
      return;
    }

    try {
      if (from === "auto") {
        from = await detectLanguage(text);
        console.log("Detected source language:", from);
      }

      const response = await fetch("/api/tts/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, from, to }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Translation failed");
      }

      translatedText.textContent = data.translated;
      outputBox.style.display = "block";

    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  });


  playBtn.addEventListener("click", () => {
    const textToSpeak = translatedText.textContent;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    // Set voice language to match the target language if possible
    const lang = toLang.value;
    utterance.lang = lang;

    // Set speech rate from speedSelect (default to 1)
    if (speedSelect) {
      const rate = parseFloat(speedSelect.value);
      utterance.rate = isNaN(rate) ? 1 : rate;
    } else {
      utterance.rate = 1;
    }

    // Cancel any current speech before speaking new text
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });

  swapBtn.addEventListener("click", () => {
    const temp = fromLang.value;
    fromLang.value = toLang.value;
    toLang.value = temp;
  });
});

