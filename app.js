const express = require("express");
const sql = require("mssql");
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");

dotenv.config();

const settingsController = require("./controller/settingsController");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const loadSettings = require("./middlewares/loadSettings");

app.use(loadSettings);


// Static files (for settings.html, settings.js, settings.css)
app.use(express.static(path.join(__dirname, "public")));

// Settings Routes (CRUD)
app.get("/api/settings/:userId", settingsController.getUserSettings);
app.post("/api/settings/:userId", settingsController.saveOrUpdateUserSettings);


app.get("/api/some-feature", (req, res) => {
  const lang = req.settings.language || "en";
  res.json({ message: `Preferred language is ${lang}` });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Settings app running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down...");
  await sql.close();
  console.log("SQL connection closed.");
  process.exit(0);
});
