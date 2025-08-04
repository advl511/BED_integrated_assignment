const path = require("path");
const express = require("express");
const sql = require("mssql");
const dotenv = require("dotenv");
const swaggerUi = require("swagger-ui-express");
const cookieParser = require("cookie-parser");

dotenv.config();

const dbConfig = require("../dbconfig.js");
const mapController = require("./Controller/mapController");
const mapMiddleware = require("./Middleware/mapMiddleware");
const mapModel = require("./model/mapmodel");
const userController = require("./Controller/userController");

// Import generated swagger spec (generate it first by running swagger.js)
let swaggerDocument;
try {
  swaggerDocument = require("./swagger-output.json");
} catch (error) {
  console.log("Swagger document not found. Run 'node swagger.js' to generate it.");
}

const app = express();
const PORT = process.env.PORT || 3000;

// Serve the Swagger UI at a specific route
if (swaggerDocument) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log("Swagger UI available at http://localhost:3000/api-docs");
}

// Global middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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

// Serve static files from the root directory (for images, styles, etc.)
app.use(express.static(path.join(__dirname)));

// Serve the map.html file at the root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'map.html'));
});

// Serve authentication pages
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'signup.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'profile.html'));
});

app.get('/map', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'map.html'));
});

// API Configuration endpoint
app.get("/map/config", (req, res) => {
    res.json({
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
    });
});

// User Authentication Routes
app.post("/auth/register", userController.registerUser);
app.post("/auth/login", userController.loginUser);
app.post("/auth/logout", userController.verifyToken, userController.logoutUser);
app.post("/auth/logout-all", userController.verifyToken, userController.logoutAllSessions);
app.post("/auth/refresh", userController.verifyToken, userController.refreshToken);
app.get("/auth/check-email/:email", userController.checkEmailExists);
app.get("/auth/check-username/:username", userController.checkUsernameExists);
app.get("/auth/me", userController.verifyToken, (req, res) => {
    res.json({ user: req.user });
});

// API Routes
app.get("/locations", mapController.getAllLocations);
app.get("/locations/:user_id", mapMiddleware.validateUserId, mapController.getLocationByUser);
app.post("/locations", mapMiddleware.validateUserId, mapMiddleware.validateLocationData, mapController.saveLocation);
app.put("/locations/:user_id/:location_id", mapMiddleware.validateUserId, mapMiddleware.validateLocationId, mapMiddleware.validateLocationData, mapController.updateLocation);
app.delete("/locations/:user_id/:location_id", mapMiddleware.validateUserId, mapMiddleware.validateLocationId, mapController.deleteLocation);

// Routes API
app.get("/routes", mapController.getAllRoutes);
app.get("/routes/:user_id", mapMiddleware.validateUserId, mapController.getRoutesByUser);
app.post("/routes", mapMiddleware.validateUserId, mapMiddleware.validateRouteData, mapController.saveRoute);
app.put("/routes/:user_id/:route_id", mapMiddleware.validateUserId, mapMiddleware.validateRouteId, mapMiddleware.validateRouteNameUpdate, mapController.updateRoute);
app.delete("/routes/:user_id/:route_id", mapMiddleware.validateUserId, mapMiddleware.validateRouteId, mapController.deleteRoute);

// Initialize database and start server
sql.connect(dbConfig).then(() => {
  console.log("Database connected successfully");
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}).catch(error => {
  console.error("Database connection failed:", error);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Server is gracefully shutting down");
  await sql.close();
  console.log("Database connections closed");
  process.exit(0);
});