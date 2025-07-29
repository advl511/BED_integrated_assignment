const path = require("path");
const express = require("express");
const sql = require("mssql");
const dotenv = require("dotenv");

dotenv.config();

const mapController = require("./controller/Mapcontroller");
const mapMiddleware = require("./Middlewares/mapmiddleware");
const mapModel = require("./model/mapmodel");

const app = express();
const PORT = process.env.PORT || 3000;

// Global middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for standalone HTML files
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the map.html file at the root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'map.html'));
});

// API Configuration endpoint
app.get("/map/config", (req, res) => {
    res.json({
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
    });
});

// API Routes
app.get("/locations", mapController.getAllLocations);
app.get("/locations/:user_id", mapMiddleware.validateUserId, mapController.getLocationByUser);
app.post("/locations", mapMiddleware.validateUserId, mapMiddleware.validateLocationData, mapController.saveLocation);
app.delete("/locations/:user_id/:location_id", mapMiddleware.validateUserId, mapMiddleware.validateLocationId, mapController.deleteLocation);

// Routes API
app.get("/routes", mapController.getAllRoutes);
app.get("/routes/:user_id", mapMiddleware.validateUserId, mapController.getRoutesByUser);
app.post("/routes", mapMiddleware.validateUserId, mapMiddleware.validateRouteData, mapController.saveRoute);
app.put("/routes/:user_id/:route_id", mapMiddleware.validateUserId, mapMiddleware.validateRouteId, mapMiddleware.validateRouteNameUpdate, mapController.updateRoute);
app.delete("/routes/:user_id/:route_id", mapMiddleware.validateUserId, mapMiddleware.validateRouteId, mapController.deleteRoute);


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Server is gracefully shutting down");
  await sql.close();
  console.log("Database connections closed");
  process.exit(0);
});