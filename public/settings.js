document.addEventListener("DOMContentLoaded", async () => {
  const userId = localStorage.getItem("userId") || "1"; // adjust as needed

  try {
    const res = await fetch(`/api/settings/${userId}`, { method: "GET", credentials: "include" });
    if (!res.ok) throw new Error("Failed to load settings");
    const settings = await res.json();

    if (settings.language) document.getElementById("language").value = settings.language;
    if (settings.fontSize) {
      document.getElementById("fontSize").value = settings.fontSize;
      document.documentElement.style.setProperty('--font-size', fontSizeValue(settings.fontSize));
    }
    if (settings.theme) {
      document.getElementById("theme").value = settings.theme;
      applyTheme(settings.theme);
    }
    if (settings.timeFormat) document.getElementById("timeFormat").value = settings.timeFormat;
  } catch (error) {
    console.error(error);
  }
});

function fontSizeValue(label) {
  switch (label) {
    case "small": return "14px";
    case "medium": return "18px";
    case "large": return "22px";
    case "xlarge": return "26px";
    default: return "18px";
  }
}

function applyTheme(theme) {
  const htmlEl = document.documentElement;
  if (theme === "dark") {
    htmlEl.classList.add("dark-theme");
  } else if (theme === "light") {
    htmlEl.classList.remove("dark-theme");
  } else if (theme === "system") {
    // Apply theme based on system preference
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) {
      htmlEl.classList.add("dark-theme");
    } else {
      htmlEl.classList.remove("dark-theme");
    }
    // Listen for changes in system preference
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (e.matches) {
        htmlEl.classList.add("dark-theme");
      } else {
        htmlEl.classList.remove("dark-theme");
      }
    });
  }
}

async function saveSettings() {
  const userId = localStorage.getItem("userId") || "1";

  const settings = {
    language: document.getElementById("language").value,
    fontSize: document.getElementById("fontSize").value,
    theme: document.getElementById("theme").value,
    timeFormat: document.getElementById("timeFormat").value,
  };

  try {
    const res = await fetch(`/api/settings/${userId}`, {
      method: "POST", // or PUT if you prefer
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(settings),
    });

    if (res.ok) {
      alert("Settings saved!");
      document.documentElement.style.setProperty('--font-size', fontSizeValue(settings.fontSize));
      applyTheme(settings.theme);
    } else {
      alert("Error saving settings.");
    }
  } catch (error) {
    alert("Network error.");
    console.error(error);
  }
}

// Attach save handler to form submission
document.getElementById("settingsForm").addEventListener("submit", (e) => {
  e.preventDefault();
  saveSettings();
});

// Optional: Reset button behavior if you have one
const resetBtn = document.getElementById("resetBtn");
if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    document.getElementById("settingsForm").reset();
    document.documentElement.style.setProperty('--font-size', fontSizeValue("medium"));
    applyTheme("light"); // or "system" or your default
  });
}
