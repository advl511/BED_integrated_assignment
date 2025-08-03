const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const sql = require("mssql");
const ttsRoutes = require("./routes/ttsRoutes");

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
app.use(express.static(path.join(__dirname, "publictts")));



// Routes
app.use("/api/tts", ttsRoutes);

// Default route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "publictts", "index.html"));
});

// Start server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

process.on("SIGINT", async () => {
  console.log("👋 Gracefully shutting down");
  await sql.close();
  process.exit(0);
});
