document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const langSelect = document.getElementById("languageSelect");

  // Load saved preferred language or default to English
  const savedLang = localStorage.getItem("preferredLang") || "en";
  langSelect.value = savedLang;

  // Update localStorage on language change
  langSelect.addEventListener("change", () => {
    localStorage.setItem("preferredLang", langSelect.value);
    alert("Language preference saved!");
  });

  // Load saved chat settings if available and populate inputs
  const savedSettings = localStorage.getItem("chatSettings");
  if (savedSettings) {
    const settings = JSON.parse(savedSettings);

    if (settings.direction) document.getElementById("translation-direction").value = settings.direction;
    if (settings.fontSize) document.getElementById("font-size").value = settings.fontSize;
    if (typeof settings.timestamps === "boolean") document.getElementById("timestamps").checked = settings.timestamps;
    if (typeof settings.sound === "boolean") document.getElementById("sound").checked = settings.sound;
  }
});

// Tab switcher function
function showTab(tabName) {
  document.getElementById("account").classList.add("hidden");
  document.getElementById("chat").classList.add("hidden");
  document.getElementById(tabName).classList.remove("hidden");
}

// Save all settings on button click
function saveSettings() {
  const language = document.getElementById("languageSelect").value; // languageSelect id matches selector above
  const direction = document.getElementById("translation-direction").value;
  const fontSize = document.getElementById("font-size").value;
  const timestamps = document.getElementById("timestamps").checked;
  const sound = document.getElementById("sound").checked;

  const settings = {
    language,
    direction,
    fontSize,
    timestamps,
    sound
  };

  // Save full chat settings as JSON
  localStorage.setItem("chatSettings", JSON.stringify(settings));
  // Save language separately for translation use
  localStorage.setItem("preferredLang", language);

  alert("Settings saved!");
}
