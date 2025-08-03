const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const sql = require("mssql");
const ttsRoutes = require("./Middleware/ttsRoutes");

dotenv.config();

const { config } = require("./db");

// Connect to SQL Server
sql.connect(config)
  .then(() => console.log("✅ Connected to SQL Server"))
  .catch((err) => {
    console.error("❌ SQL connection error:", err);
    process.exit(1);
  });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static folders
app.use(express.static(path.join(__dirname, "pages")));   // tts.html
app.use("/styles", express.static(path.join(__dirname, "styles")));
app.use("/publictts", express.static(path.join(__dirname, "publictts"))); // if you have other static files

// API Routes
app.use("/api/tts", ttsRoutes);

// Default Route (home page)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "pages", "tts.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("👋 Gracefully shutting down");
  await sql.close();
  process.exit(0);
});
