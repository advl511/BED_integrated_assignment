document.addEventListener("DOMContentLoaded", () => {
  const messageList = document.getElementById("chatBox");
  const messageInput = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");

  const preferredLang = localStorage.getItem("preferredLang") || "en";
  const jwtToken = localStorage.getItem("jwtToken"); // Assumes user is logged in

  // 🔁 Append one message to UI
  function appendMessage(msg) {
    const item = document.createElement("div");
    item.className = "message";

    const senderEl = document.createElement("div");
    senderEl.className = "sender";
    senderEl.textContent = msg.sender;

    const contentEl = document.createElement("div");
    contentEl.className = "original";
    contentEl.textContent = msg.content;

    const translatedEl = document.createElement("div");
    translatedEl.className = "translated";
    translatedEl.textContent = msg.translated || "";
    translatedEl.style.marginTop = "4px";

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "toggle-btn";
    toggleBtn.textContent = "Hide translation";
    toggleBtn.style.marginTop = "4px";

    toggleBtn.addEventListener("click", () => {
      if (translatedEl.style.display === "none") {
        translatedEl.style.display = "block";
        toggleBtn.textContent = "Hide translation";
      } else {
        translatedEl.style.display = "none";
        toggleBtn.textContent = "Show translation";
      }
    });

    // ✅ DELETE BUTTON
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑 Delete";
    deleteBtn.className = "delete-btn";
    deleteBtn.style.marginLeft = "8px";

    deleteBtn.addEventListener("click", async () => {
      if (!confirm("Delete this message?")) return;
      try {
        const resp = await fetch(`/api/messages/${msg.id}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${jwtToken}`
          }
        });
        if (resp.ok) {
          await fetchMessages(); // refresh
        } else {
          console.error("Delete failed:", await resp.text());
        }
      } catch (err) {
        console.error("Delete error:", err);
      }
    });

    item.appendChild(senderEl);
    item.appendChild(contentEl);
    item.appendChild(translatedEl);
    item.appendChild(toggleBtn);
    item.appendChild(deleteBtn);

    messageList.appendChild(item);
  }

  // 🔁 Fetch and display messages
  async function fetchMessages() {
    try {
      const res = await fetch(`/api/messages?lang=${preferredLang}`);
      const data = await res.json();

      messageList.innerHTML = "";
      data.forEach(msg => appendMessage(msg));
    } catch (err) {
      console.error("Fetch failed:", err);
      messageList.innerHTML = "<p>Error loading messages.</p>";
    }
  }

  // ✅ Send message with optimistic UI
  sendBtn.addEventListener("click", async () => {
    const sender = "Anonymous";
    const content = messageInput.value.trim();

    if (!content) {
      alert("Message cannot be empty");
      return;
    }

    // 1. Show message instantly without translation
    appendMessage({ sender, content, translated: "" });
    messageInput.value = "";

    // 2. Send to server and fetch updated (translated) messages
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender, content })
      });
      fetchMessages();
    } catch (err) {
      console.error("Message send error:", err);
    }
  });

  // 🚀 Initial load
  fetchMessages();
});
