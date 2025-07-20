const path = require('path');
const express = require('express');
const sql = require('mssql');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Import middleware and controllers
const mapMiddleware = require('./Middlewares/mapmiddleware');
const mapController = require('./controller/Mapcontroller');
const mapModel = require('./model/mapmodel');

// Setup basic middleware
mapMiddleware.setupBasicMiddleware(app);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "public")));

// Setup health check
mapMiddleware.setupHealthCheck(app);

// API routes
app.use('/api/map', mapController);  // Updated to use /api/map prefix
app.use('/map', mapController);      // Keep backward compatibility

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'map.html'));
});

// Setup error handling
mapMiddleware.setupErrorHandling(app);

// Initialize database and start server
async function startServer() {
  try {
    // Check if required environment variables are set
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      console.error('GOOGLE_MAPS_API_KEY is not set in environment variables');
      process.exit(1);
    }
    
    // Connect to database and initialize tables
    await mapModel.connect();
    await mapModel.initializeTables();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Map available at http://localhost:${PORT}/`);
      console.log(`Health check at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Server is gracefully shutting down");
  await sql.close();
  console.log("Database connections closed");
  process.exit(0);
});

startServer();