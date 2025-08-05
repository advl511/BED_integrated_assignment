async function saveSettings() {
  const userId = localStorage.getItem("userId") || "1";
  const language = document.getElementById("language").value;
  const fontSize = fontSizeValue(document.getElementById("fontSize").value);
  const theme = document.getElementById("theme").value;

  try {
    const response = await fetch(`http://localhost:3000/api/settings/${userId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language,
        fontSize,
        theme
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to save settings");
    }

    console.log("✅ Settings saved successfully");
    // Reapply settings to see changes immediately
    applyTheme(theme);
    applyFontSize(fontSize);
    applyLanguage(language);
  } catch (error) {
    console.error("❌ Error saving settings:", error);
  }
}

// Add event listener to your save button
document.getElementById("saveSettings").addEventListener("click", saveSettings);