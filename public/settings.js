document.addEventListener("DOMContentLoaded", async () => {
  const userId = localStorage.getItem("userId") || "user123"; // Fallback userId

  const language = document.getElementById("language");
  const direction = document.getElementById("direction");
  const fontSize = document.getElementById("fontSize");
  const timestamps = document.getElementById("timestamps");
  const sound = document.getElementById("sound");
  const settingsForm = document.getElementById("settingsForm");

  // Check if all elements exist
  if (!language || !direction || !fontSize || !timestamps || !sound || !settingsForm) {
    console.error("One or more settings form elements not found in the DOM.");
    return;
  }

  // Load settings from DB
  async function loadSettings() {
    try {
      const res = await fetch(`/api/settings/${userId}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();

      if (data.language) language.value = data.language;
      if (data.direction) direction.value = data.direction;
      if (data.fontSize) fontSize.value = data.fontSize;
      timestamps.checked = !!data.timestamps;
      sound.checked = !!data.sound;
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  }

  // Save settings to DB
  settingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const settings = {
      language: language.value,
      direction: direction.value,
      fontSize: fontSize.value,
      timestamps: timestamps.checked,
      sound: sound.checked,
    };

    try {
      const res = await fetch(`/api/settings/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || "✅ Settings saved!");
        localStorage.setItem("preferredLang", language.value); // Save preferred language
      } else {
        alert(data.error || "❌ Failed to save settings.");
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
      alert("❌ Failed to save settings.");
    }
  });

  loadSettings();
});
