const express = require("express");
const sql = require("mssql");
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");

dotenv.config();

const settingsController = require("./Controller/settingsController");
const { loadSettings } = require("./Middleware/loadSettings");

const app = express();
const PORT = process.env.PORT || 5502;

// Debug middleware
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5502', 'http://127.0.0.1:5502'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes FIRST
console.log("🔍 Loading settings routes...");
try {
  const settingsRoutes = require("./backend/settings");
  app.use("/api/settings", settingsRoutes);
  console.log("✅ Settings API routes registered");
} catch (error) {
  console.error("❌ Error loading settings routes:", error);
}

// Settings page route
app.use("/settings", loadSettings, (req, res, next) => {
  res.sendFile(path.join(__dirname, "Pages", "settings.html"));
});

// Static files with proper paths
app.use('/Pages', express.static(path.join(__dirname, "Pages")));    // HTML at /Pages/
app.use('/styles', express.static(path.join(__dirname, "styles")));  // CSS at /styles/
app.use('/backend', express.static(path.join(__dirname, "backend"))); // JS at /backend/
app.use('/languages', express.static(path.join(__dirname, "languages")));

// Also serve at root for direct access
app.use(express.static(path.join(__dirname, "Pages")));    // HTML files
app.use(express.static(path.join(__dirname, "styles")));  // CSS files
app.use(express.static(path.join(__dirname, "backend"))); // JS files

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