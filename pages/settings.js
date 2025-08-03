document.addEventListener("DOMContentLoaded", async () => {
  const userId = localStorage.getItem("userId") || "1"; 
  
  console.log("🚀 Settings page loaded, userId:", userId);
  console.log("🌐 Current URL:", window.location.href);
  console.log("🔗 Base URL:", window.location.origin);

  try {
    const url = `http://localhost:5502/api/settings/${userId}`;
    console.log("📡 Fetching from:", url);
    
    const res = await fetch(url);
    console.log("📨 Response status:", res.status);
    console.log("📨 Response ok:", res.ok);
    
    if (!res.ok) {
      console.error("❌ Response not ok:", res.status, res.statusText);
      throw new Error("Failed to load settings");
    }
    
    const settings = await res.json();
    console.log("✅ Settings loaded:", settings);

    // Apply settings to form elements
    if (settings.language) {
      const langSelect = document.getElementById("language");
      if (langSelect) {
        langSelect.value = settings.language;
        console.log("🌍 Language set to:", settings.language);
      }
      // Apply language changes
      applyLanguage(settings.language);
    }
    
    if (settings.fontSize) {
      const fontSelect = document.getElementById("fontSize");
      if (fontSelect) {
        fontSelect.value = settings.fontSize;
        console.log("🔡 Font size set to:", settings.fontSize);
      }
      // Apply font size immediately with better method
      applyFontSize(settings.fontSize);
    }
    
    if (settings.theme) {
      const themeSelect = document.getElementById("theme");
      if (themeSelect) {
        themeSelect.value = settings.theme;
        console.log("🎨 Theme set to:", settings.theme);
      }
      // Apply theme immediately
      applyTheme(settings.theme);
    }
    
    if (settings.timeFormat) {
      const timeSelect = document.getElementById("timeFormat");
      if (timeSelect) {
        timeSelect.value = settings.timeFormat;
        console.log("🕒 Time format set to:", settings.timeFormat);
      }
    }
  } catch (error) {
    console.error("❌ Error loading settings:", error);
    // Apply default settings if loading fails
    applyTheme("light");
    document.documentElement.style.setProperty('--font-size', fontSizeValue("medium"));
    document.body.style.fontSize = fontSizeValue("medium");
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

function applyFontSize(fontSize) {
  const fontSizePixels = fontSizeValue(fontSize);
  
  // Apply to CSS custom property
  document.documentElement.style.setProperty('--font-size', fontSizePixels);
  
  // Also apply directly to body and form elements
  document.body.style.fontSize = fontSizePixels;
  
  // Apply to all text elements
  const elements = document.querySelectorAll('body, p, div, span, label, button, select, input, h1, h2, h3, h4, h5, h6');
  elements.forEach(el => {
    el.style.fontSize = fontSizePixels;
  });
  
  console.log("🔡 Font size applied to all elements:", fontSizePixels);
}

function applyLanguage(language) {
  // Use the global language system to change language site-wide
  if (window.languageSystem) {
    window.languageSystem.setLanguage(language);
  }
  
  console.log("🌍 Language applied:", language);
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

  console.log("💾 Saving settings for userId:", userId);
  console.log("💾 Settings to save:", settings);

  try {
    const url = `http://localhost:5502/api/settings/${userId}`;
    console.log("📡 Posting to:", url);
    
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(settings),
    });

    console.log("📨 Save response status:", res.status);
    console.log("📨 Save response ok:", res.ok);

    if (res.ok) {
      console.log("✅ Settings saved successfully!");
      alert("Settings saved!");
      
      // Apply the new settings immediately after saving
      applyFontSize(settings.fontSize);
      applyTheme(settings.theme);
      applyLanguage(settings.language);
      
    } else {
      console.error("❌ Error saving settings:", res.status, res.statusText);
      alert("Error saving settings.");
    }
  } catch (error) {
    console.error("❌ Network error:", error);
    alert("Network error.");
  }
}

// Attach save handler to form submission
document.getElementById("settingsForm").addEventListener("submit", (e) => {
  e.preventDefault();
  console.log("📝 Form submitted, calling saveSettings()");
  saveSettings();
});

// Add live preview - changes apply immediately when you select them
document.addEventListener("DOMContentLoaded", () => {
  // Font size live preview
  const fontSizeSelect = document.getElementById("fontSize");
  if (fontSizeSelect) {
    fontSizeSelect.addEventListener("change", (e) => {
      applyFontSize(e.target.value);
      console.log("🔡 Live preview: Font size changed to", e.target.value);
    });
  }
  
  // Theme live preview
  const themeSelect = document.getElementById("theme");
  if (themeSelect) {
    themeSelect.addEventListener("change", (e) => {
      applyTheme(e.target.value);
      console.log("🎨 Live preview: Theme changed to", e.target.value);
    });
  }
  
  // Language live preview
  const languageSelect = document.getElementById("language");
  if (languageSelect) {
    languageSelect.addEventListener("change", (e) => {
      applyLanguage(e.target.value);
      console.log("🌍 Live preview: Language changed to", e.target.value);
    });
  }
});

// Optional: Reset button behavior if you have one
const resetBtn = document.getElementById("resetBtn");
if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    console.log("🔄 Reset button clicked");
    document.getElementById("settingsForm").reset();
    
    // Apply default settings
    applyFontSize("medium");
    applyTheme("light");
    applyLanguage("en");
  });
}