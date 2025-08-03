function showTab(tabName) {
  document.getElementById("account").classList.add("hidden");
  document.getElementById("chat").classList.add("hidden");
  document.getElementById(tabName).classList.remove("hidden");
}

function saveSettings() {
  const language = document.getElementById("language").value;
  const direction = document.getElementById("translation-direction").value;
  const fontSize = document.getElementById("font-size").value;

  const timestamps = document.getElementById("timestamps").checked;
  const sound = document.getElementById("sound").checked;

  console.log({
    language,
    direction,
    fontSize,
    timestamps,
    sound
  });

  alert("Settings saved!");
}
