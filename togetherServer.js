const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sql = require('mssql');
const cookieParser = require('cookie-parser');
const swaggerUi = require("swagger-ui-express");
require('dotenv').config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 3000;

// Import controllers and middleware
const userController = require('./Controller/userController');
const profileController = require('./Controller/profileController');
const statusController = require('./Controller/statusController');
const friendsController = require('./Controller/friendsController');
const mapController = require("./Controller/mapController");

const { validateSignup, validateLogin } = require('./Middleware/userMiddleware');
const mapMiddleware = require("./Middleware/mapMiddleware");

const { verifyToken } = userController;
const dbConfig = require('./dbConfig');

// Import generated swagger spec (generate it first by running swagger.js)
let swaggerDocument;
try {
  swaggerDocument = require("./swagger-output.json");
} catch (error) {
  console.log("Swagger document not found. Run 'node swagger.js' to generate it.");
}

// Serve the Swagger UI at a specific route
if (swaggerDocument) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log("Swagger UI available at http://localhost:3000/api-docs");
}

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    console.log('File filter check:', file.originalname, file.mimetype);
    // Check file type - allow images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      console.log('File accepted:', file.originalname);
      cb(null, true);
    } else {
      console.log('File rejected:', file.originalname, file.mimetype);
      cb(new Error('Only image and video files are allowed!'), false);
    }
  }
});

// CORS middleware - updated for cookie support and multiple origins
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000', 
    'http://localhost:5500',  // Live Server default
    'http://127.0.0.1:5500',  // Live Server default
    'null'  // For file:// protocol
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || !origin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true'); // Required for cookies
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Global middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static files from the backend directory (for JS files)
app.use(express.static('./backend'));
// Serve static files from the pages directory  
app.use(express.static('./pages'));
// Serve static files from the styles directory
app.use(express.static('./styles'));
// Serve static files from the root directory (for images, styles, etc.)
app.use(express.static(path.join(__dirname)));

// Add request logging for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  if (req.method !== 'GET' || req.url.includes('api')) {
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('Cookies:', req.cookies);
  }
  next();
});

// ===============================
// PAGE ROUTING
// ===============================

// Main route - serve home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'home.html'));
});

// Serve authentication pages
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'login.html'));
});

app.get('/signin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'signin.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'signup.html'));
});

app.get('/signup.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'signup.html'));
});app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'profile.html'));
});

app.get('/profile.html', (req, res) => {
  console.log('Profile.html route accessed');
  res.sendFile(path.join(__dirname, 'pages', 'profile.html'));
});

app.get('/map', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'map.html'));
});

app.get('/home.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'home.html'));
});

// Test route to verify server is working
app.get('/test', (req, res) => {
  res.json({ message: 'Together Server is working', timestamp: new Date().toISOString() });
});

// Health check endpoint for monitoring server status
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'Server is healthy'
  });
});

// ===============================
// MAP API ROUTES
// ===============================

// API Configuration endpoint for Google Maps
app.get("/map/config", (req, res) => {
  res.json({
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
  });
});

// Location API Routes
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

// ===============================
// USER AUTHENTICATION ROUTES
// ===============================

// Public authentication routes (no token required)
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

// Legacy API routes for userApp compatibility
app.post('/api/users/signup', validateSignup, userController.registerUser);
app.post('/api/users/login', validateLogin, userController.loginUser);
app.get('/api/users/check-email/:email', userController.checkEmailExists);
app.get('/api/users/check-username/:username', userController.checkUsernameExists);

// User search and profile routes
app.get('/api/users/search', userController.searchUsers);
app.get('/api/users/:userId', userController.getUserProfile);
app.put('/api/users/:userId', userController.verifyToken, userController.updateUserProfile);

// Protected routes (authentication required)
app.get('/api/users/profile', verifyToken, (req, res) => {
  // Return user profile information from token
  res.json({
    message: 'Profile accessed successfully',
    user: req.user
  });
});

// Route to verify if token is valid
app.get('/api/users/verify-token', verifyToken, (req, res) => {
  res.json({
    message: 'Token is valid',
    user: req.user
  });
});

// Logout routes
app.post('/api/users/logout', verifyToken, userController.logoutUser);
app.post('/api/users/logout-all', verifyToken, userController.logoutAllSessions);
app.post('/api/users/refresh-token', verifyToken, userController.refreshToken);

// ===============================
// PROFILE ROUTES
// ===============================

app.get('/api/profiles/:userId', profileController.getProfile);
app.post('/api/profiles/:userId', profileController.createProfile);
app.put('/api/profiles/:userId', profileController.updateProfile);
app.post('/api/profiles/:userId/picture', upload.single('profilePicture'), profileController.updateProfilePicture);
app.delete('/api/profiles/:userId', profileController.deleteProfile);
app.get('/api/profiles/search', profileController.searchProfiles);

// ===============================
// STATUS ROUTES
// ===============================

app.post('/api/statuses', statusController.createStatus);
app.post('/api/statuses/with-attachments', upload.array('attachments', 5), statusController.createStatusWithAttachments);
app.get('/api/statuses/recent', statusController.getRecentStatuses);
app.get('/api/statuses/search', statusController.searchStatuses);
app.get('/api/statuses/:userId', statusController.getStatuses);
app.get('/api/statuses/:userId/count', statusController.getStatusCount);
app.get('/api/status/:statusId', statusController.getStatus);
app.put('/api/statuses/:statusId', statusController.updateStatus);
app.delete('/api/statuses/:statusId', statusController.deleteStatus);
app.get('/api/feed/:userId', statusController.getFeed);

// ===============================
// FRIENDS ROUTES
// ===============================

app.post('/api/friends/request', friendsController.sendFriendRequest);
app.put('/api/friends/accept/:requestId', friendsController.acceptFriendRequest);
app.put('/api/friends/reject/:requestId', friendsController.rejectFriendRequest);
app.get('/api/friends/:userId', friendsController.getFriends);
app.get('/api/friends/:userId/pending', friendsController.getPendingRequests);
app.get('/api/friends/:userId/sent', friendsController.getSentRequests);
app.delete('/api/friends/:userId/:friendId', friendsController.removeFriend);
app.get('/api/friends/:userId/:friendId/status', friendsController.getFriendshipStatus);
app.get('/api/friends/:userId/count', friendsController.getFriendCount);
app.get('/api/friends/:userId1/:userId2/mutual', friendsController.getMutualFriends);

// ===============================
// ERROR HANDLING MIDDLEWARE
// ===============================

// Error handling middleware for multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error('Multer error:', error);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum is 5 files.' });
    }
    return res.status(400).json({ error: 'File upload error: ' + error.message });
  }
  
  if (error.message === 'Only image and video files are allowed!') {
    return res.status(400).json({ error: error.message });
  }
  
  console.error('General error:', error);
  return res.status(500).json({ error: 'Internal server error' });
});

// Catch-all route for debugging 404s
app.use('*', (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    message: 'This is the Together Server - combining Map and User functionality',
    availableRoutes: {
      pages: [
        'GET / (map.html)',
        'GET /map',
        'GET /login',
        'GET /register', 
        'GET /signin.html',
        'GET /signup.html',
        'GET /profile',
        'GET /profile.html',
        'GET /home.html'
      ],
      mapAPI: [
        'GET /locations',
        'GET /locations/:user_id',
        'POST /locations',
        'PUT /locations/:user_id/:location_id',
        'DELETE /locations/:user_id/:location_id',
        'GET /routes',
        'GET /routes/:user_id',
        'POST /routes',
        'PUT /routes/:user_id/:route_id',
        'DELETE /routes/:user_id/:route_id',
        'GET /map/config'
      ],
      authAPI: [
        'POST /auth/register',
        'POST /auth/login',
        'POST /auth/logout',
        'GET /auth/me',
        'GET /auth/check-email/:email',
        'GET /auth/check-username/:username'
      ],
      userAPI: [
        'POST /api/users/signup',
        'POST /api/users/login',
        'GET /api/users/search',
        'GET /api/users/:userId',
        'PUT /api/users/:userId',
        'GET /api/users/profile',
        'GET /api/users/verify-token'
      ],
      profileAPI: [
        'GET /api/profiles/:userId',
        'POST /api/profiles/:userId',
        'PUT /api/profiles/:userId',
        'POST /api/profiles/:userId/picture',
        'DELETE /api/profiles/:userId'
      ],
      statusAPI: [
        'POST /api/statuses',
        'GET /api/statuses/recent',
        'GET /api/statuses/:userId',
        'GET /api/feed/:userId'
      ],
      friendsAPI: [
        'POST /api/friends/request',
        'GET /api/friends/:userId',
        'DELETE /api/friends/:userId/:friendId'
      ],
      utilities: [
        'GET /test',
        'GET /api-docs (Swagger documentation)'
      ]
    }
  });
});

// ===============================
// SERVER INITIALIZATION
// ===============================

// Start server with database connection
async function startServer() {
  try {
    // Initialize database connection
    console.log('Connecting to database...');
    await sql.connect(dbConfig);
    console.log('Database connected successfully');
    
    app.listen(PORT, () => {
      console.log(`Together Server running on http://localhost:${PORT}`);
      console.log(`Map functionality available at http://localhost:${PORT}/map`);
      console.log(`User profiles available at http://localhost:${PORT}/profile`);
      console.log(`Home page available at http://localhost:${PORT}/home.html`);
      console.log(`API documentation at http://localhost:${PORT}/api-docs`);
      console.log(`Test endpoint at http://localhost:${PORT}/test`);
    });
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Together Server is gracefully shutting down");
  await sql.close();
  console.log("Database connections closed");
  process.exit(0);
});
