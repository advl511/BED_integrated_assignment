const express = require("express");
const router = express.Router();
const verifyToken = require("../Middlewares/authmiddleware");
const messageController = require("../Controller/messageController");

// Create message (no auth required here?)
router.post("/", async (req, res) => {
  console.log("Received POST /api/messages");
  console.log("Request body:", req.body);

  try {
    let { sender, content, translated } = req.body;

    if (!sender || typeof sender !== "string") sender = "Anonymous";
    if (!content || typeof content !== "string" || content.trim() === "") {
      return res.status(400).json({ error: "Content is required" });
    }
    if (!translated || typeof translated !== "string") translated = "";

    console.log("Final cleaned values:", { sender, content, translated });

    await messageController.createMessage(sender.trim(), content.trim(), translated.trim());

    console.log("Message inserted into DB");
    res.status(201).json({ message: "Message created" });
  } catch (err) {
    console.error("Error in POST /api/messages:", err);
    res.status(500).json({ error: "Failed to create message" });
  }
});

// Read all messages
router.get("/", async (req, res) => {
  try {
    const messages = await messageController.getAllMessages();
    res.json(messages);
  } catch (err) {
    console.error("Error in GET /api/messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Update message (protected)
router.put("/:id", verifyToken, async (req, res) => {
  try {
    await messageController.updateMessage(req.params.id, req.body.content, req.body.translated);
    res.json({ message: "Message updated" });
  } catch (err) {
    console.error("Error in PUT /api/messages/:id:", err);
    res.status(500).json({ error: "Failed to update message" });
  }
});

// Delete message (protected)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    await messageController.deleteMessage(req.params.id);
    res.json({ message: "Message deleted" });
  } catch (err) {
    console.error("Error in DELETE /api/messages/:id:", err);
    res.status(500).json({ error: "Failed to delete message" });
  }
});

// WARNING: For development use only!
router.delete("/delete/all", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    await pool.request().query("DELETE FROM Messages");
    res.json({ message: "All messages deleted" });
  } catch (err) {
    console.error("Error deleting all messages:", err);
    res.status(500).json({ error: "Failed to delete all messages" });
  }
});

module.exports = router;
