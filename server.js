const path = require('path');
const express = require('express');
const sql = require('mssql');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Import controllers and middleware
const mapController = require('./controller/Mapcontroller');
const mapMiddleware = require('./Middlewares/mapmiddleware');

// Setup basic middleware stack
mapMiddleware.setupBasicMiddleware(app);

// Setup health check endpoint
mapMiddleware.setupHealthCheck(app);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "public")));

// API routes
app.use('/map', mapController);

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'map.html'));
});

// Setup error handling middleware
mapMiddleware.setupErrorHandling(app);


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Server is gracefully shutting down");
  await sql.close();
  console.log("Database connections closed");
  process.exit(0);
});    