const express = require("express");
const sql = require("mssql");
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");

dotenv.config();

const settingsController = require("./Controller/settingsController");
const {loadSettings} = require("./Middlewares/loadSettings");




const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (for HTML/CSS/JS)
app.use(express.static(path.join(__dirname, "Public")));
const settingsRoutes = require("./routes/settings");
app.use("/api/settings", settingsRoutes);

// ========== Settings API Routes ==========
app.get("/api/settings/:userId", settingsController.getUserSettings);
app.post("/api/settings/:userId", settingsController.upsertUserSettings);
app.put("/api/settings/:userId", settingsController.upsertUserSettings);

// Apply `loadSettings` middleware only to front-end routes needing user settings
console.log("loadSettings is", typeof loadSettings);
app.use("/settings", loadSettings);

// ========== Example Route with Settings ==========
app.get("/api/some-feature", loadSettings, (req, res) => {
  const lang = req.settings.language || "en";
  const fontSize = req.settings.fontSize || "medium";
  res.json({ message: `Preferred language is ${lang}, font size is ${fontSize}` });
});

// ========== Start Server ==========
app.listen(PORT, () => {
  console.log(`✅ Settings app running on http://localhost:${PORT}`);
});

// ========== Graceful Shutdown ==========
process.on("SIGINT", async () => {
  console.log("Shutting down...");
  await sql.close();
  console.log("SQL connection closed.");
  process.exit(0);
});
