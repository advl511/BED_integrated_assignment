document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("settingsForm");

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings", {
        headers: { Authorization: `Bearer ${localStorage.getItem("jwtToken")}` }
      });
      const data = await res.json();
      if (!data) return;

      document.getElementById("language").value = data.language;
      document.getElementById("direction").value = data.direction;
      document.getElementById("fontSize").value = data.fontSize;
      document.getElementById("timestamps").checked = data.timestamps;
      document.getElementById("sound").checked = data.sound;
    } catch (err) {
      console.error("Error loading settings:", err);
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const settings = {
      language: document.getElementById("language").value,
      direction: document.getElementById("direction").value,
      fontSize: document.getElementById("fontSize").value,
      timestamps: document.getElementById("timestamps").checked,
      sound: document.getElementById("sound").checked,
    };

    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("jwtToken")}`
        },
        body: JSON.stringify(settings),
      });
      alert("Settings saved!");
    } catch (err) {
      console.error("Save failed:", err);
    }
  });

  loadSettings();
});
