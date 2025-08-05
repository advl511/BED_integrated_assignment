document.addEventListener("DOMContentLoaded", async () => {
  const userId = localStorage.getItem("userId") || "1";
  
  // Initialize form with current settings
  await loadAndApplySettings(userId);
  
  // Set up save handler
  document.getElementById("settingsForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveCurrentSettings(userId);
  });
  
  // Set up reset handler
  document.getElementById("resetBtn").addEventListener("click", resetToDefaults);
});

async function loadAndApplySettings(userId) {
  try {
    const response = await fetch(`/api/settings/${userId}`);
    if (!response.ok) throw new Error("Failed to load settings");
    
    const settings = await response.json();
    
    // Update form values
    document.getElementById("language").value = settings.language;
    document.getElementById("fontSize").value = settings.fontSize;
    document.getElementById("theme").value = settings.theme;
    document.getElementById("timeFormat").value = settings.timeFormat;
    
    // Apply visual settings
    applyTheme(settings.theme);
    applyFontSize(settings.fontSize);
    document.documentElement.lang = settings.language;
    
  } catch (error) {
    console.error("Settings load error:", error);
    applyDefaultSettings();
  }
}

async function saveCurrentSettings(userId) {
  const settings = {
    language: document.getElementById("language").value,
    fontSize: document.getElementById("fontSize").value,
    theme: document.getElementById("theme").value,
    timeFormat: document.getElementById("timeFormat").value
  };

  try {
    const response = await fetch(`/api/settings/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Save failed");
    }

    // Re-apply settings
    applyTheme(settings.theme);
    applyFontSize(settings.fontSize);
    document.documentElement.lang = settings.language;
    
    showAlert("Settings saved successfully!");
  } catch (error) {
    console.error("Save error:", error);
    showAlert(`Failed to save settings: ${error.message}`, "error");
  }
}

function resetToDefaults() {
  document.getElementById("language").value = "en";
  document.getElementById("fontSize").value = "medium";
  document.getElementById("theme").value = "light";
  document.getElementById("timeFormat").value = "24h";
  applyDefaultSettings();
  showAlert("Settings reset to defaults");
}

// Helper functions
function applyTheme(theme) {
  document.documentElement.className = `${theme}-theme`;
}

function applyFontSize(size) {
  const sizes = { small: 14, medium: 16, large: 18, xlarge: 20 };
  document.documentElement.style.setProperty('--font-size', `${sizes[size] || 16}px`);
}

function applyDefaultSettings() {
  applyTheme("light");
  applyFontSize("medium");
  document.documentElement.lang = "en";
}

function showAlert(message, type = "success") {
  const alert = document.createElement("div");
  alert.className = `alert ${type}`;
  alert.textContent = message;
  document.body.appendChild(alert);
  setTimeout(() => alert.remove(), 3000);
}