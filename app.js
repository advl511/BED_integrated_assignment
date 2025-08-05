const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sql = require('mssql');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const Joi = require('joi');
const swaggerUi = require('swagger-ui-express');
const dotenv = require('dotenv');
dotenv.config();

const app = express(); 

const PORT = process.env.PORT || 3000;



// Import controllers and middleware
const userController = require('./Controller/userController');
const profileController = require('./Controller/profileController');
const statusController = require('./Controller/statusController');
const friendsController = require('./Controller/friendsController');
const mapController = require('./Controller/mapController');
const settingsController = require('./Controller/settingsController');
const AppointmentController = require('./Controller/AppointmentController');

const { validateSignup, validateLogin } = require('./Middleware/userMiddleware');
const mapMiddleware = require('./Middleware/mapMiddleware');
const AppointmentMiddleware = require('./Middleware/AppointmentMiddleware');
const { loadSettings } = require('./Middleware/loadSettings');
const ttsRoutes = require('./Middleware/ttsRoutes');

const dbConfig = require('./dbConfig');

// Load Swagger documentation if available
let swaggerDocument;
try {
  swaggerDocument = require('./swagger-output.json');
} catch (error) {
  console.log('Swagger document not found. Run "node swagger.js" to generate it.');
}

// ===============================
// MIDDLEWARE SETUP
// ===============================

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
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      console.log('File accepted:', file.originalname);
      cb(null, true);
    } else {
      console.log('File rejected:', file.originalname, file.mimetype);
      cb(new Error('Only image and video files are allowed!'), false);
    }
  }
});

// CORS middleware - comprehensive origins support
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5500', // Live Server default
    'http://127.0.0.1:5500',
    'http://localhost:5501',
    'http://127.0.0.1:5501',
    'http://localhost:5502',
    'http://127.0.0.1:5502',
    'http://localhost:5503',
    'http://127.0.0.1:5503',
    'null' // For file:// protocol
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// Debug middleware
app.use((req, res, next) => {
  console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  if (req.method !== 'GET' || req.url.includes('api')) {
    console.log('Headers:', req.headers);
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('Body:', req.body);
    }
    if (req.cookies && Object.keys(req.cookies).length > 0) {
      console.log('Cookies:', req.cookies);
    }
  }
  next();
});

// Global middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/pages', express.static(path.join(__dirname, 'pages')));
app.use('/Pages', express.static(path.join(__dirname, 'Pages')));
app.use('/styles', express.static(path.join(__dirname, 'styles')));
app.use('/backend', express.static(path.join(__dirname, 'backend')));
app.use('/languages', express.static(path.join(__dirname, 'languages')));
app.use('/public', express.static(path.join(__dirname, 'Public')));

// Also serve at root for direct access
app.use(express.static(path.join(__dirname)));
app.use(express.static('./pages'));
app.use(express.static('./Pages'));
app.use(express.static('./styles'));
app.use(express.static('./backend'));

// Swagger UI setup
if (swaggerDocument) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log('📚 Swagger UI available at http://localhost:' + PORT + '/api-docs');
}

// ===============================
// PAGE ROUTING
// ===============================

// Main route - serve home page
app.get('/', (req, res) => {
  // Check if home.html exists, otherwise redirect to signin
  const homePath = path.join(__dirname, 'pages', 'home.html');
  if (fs.existsSync(homePath)) {
    res.sendFile(homePath);
  } else {
    res.redirect('/signin.html');
  }
});

// Authentication pages
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
});

// Application pages
app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'profile.html'));
});

app.get('/profile.html', (req, res) => {
  console.log('Profile.html route accessed');
  res.sendFile(path.join(__dirname, 'pages', 'profile.html'));
});

app.get('/map', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'map.html'));
});

app.get('/map.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'map.html'));
});

app.get('/home.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'home.html'));
});

app.get('/friends.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'friends.html'));
});

app.get('/friends', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'friends.html'));
});

app.get('/friends-test', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'friends-test.html'));
});

app.get('/friends-test.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'friends-test.html'));
});

app.get('/status.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'status.html'));
});

app.get('/status', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'status.html'));
});

app.get('/calendar.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'calendar.html'));
});

app.get('/calendar', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'calendar.html'));
});

app.get('/appointment.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'appointment.html'));
});

app.get('/appointment', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'appointment.html'));
});

// Settings page with middleware
app.get('/settings', loadSettings, (req, res) => {
  const settingsPath = path.join(__dirname, 'pages', 'settings.html');
  if (fs.existsSync(settingsPath)) {
    res.sendFile(settingsPath);
  } else {
    res.sendFile(path.join(__dirname, 'Pages', 'settings.html'));
  }
});

app.get('/settings.html', loadSettings, (req, res) => {
  const settingsPath = path.join(__dirname, 'pages', 'settings.html');
  if (fs.existsSync(settingsPath)) {
    res.sendFile(settingsPath);
  } else {
    res.sendFile(path.join(__dirname, 'Pages', 'settings.html'));
  }
});

// TTS page
app.get('/tts.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'tts.html'));
});

app.get('/tts', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'tts.html'));
});



// ===============================
// API CONFIGURATION ROUTES
// ===============================

// Google Maps API configuration
app.get('/map/config', (req, res) => {
  res.json({
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'Combined server is healthy'
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({
    message: 'Combined Multi-Feature Server is working',
    timestamp: new Date().toISOString(),
    features: [
      'User Authentication',
      'Profile Management',
      'Social Features (Friends, Status)',
      'Map Integration',
      'Appointment Booking',
      'Settings Management',
      'Text-to-Speech'
    ]
  });
});

// ===============================
// USER AUTHENTICATION ROUTES
// ===============================

// Public authentication routes
app.post('/auth/register', validateSignup, userController.registerUser);
app.post('/auth/login', validateLogin, userController.loginUser);
app.post('/auth/logout', userController.verifyToken, userController.logoutUser);
app.post('/auth/logout-all', userController.verifyToken, userController.logoutAllSessions);
app.post('/auth/refresh', userController.verifyToken, userController.refreshToken);
app.get('/auth/check-email/:email', userController.checkEmailExists);
app.get('/auth/check-username/:username', userController.checkUsernameExists);
app.get('/auth/me', userController.verifyToken, (req, res) => {
  res.json({ user: req.user });
});

// Legacy API routes for compatibility
app.post('/api/users/signup', validateSignup, userController.registerUser);
app.post('/api/users/login', validateLogin, userController.loginUser);
app.get('/api/users/check-email/:email', userController.checkEmailExists);
app.get('/api/users/check-username/:username', userController.checkUsernameExists);
app.get('/api/users/search', userController.searchUsers);
app.get('/api/users/:userId', userController.getUserProfile);
app.put('/api/users/:userId', userController.verifyToken, userController.updateUserProfile);
app.get('/api/users/profile', userController.verifyToken, (req, res) => {
  res.json({
    message: 'Profile accessed successfully',
    user: req.user
  });
});
app.get('/api/users/verify-token', userController.verifyToken, (req, res) => {
  res.json({
    message: 'Token is valid',
    user: req.user
  });
});
app.post('/api/users/logout', userController.verifyToken, userController.logoutUser);
app.post('/api/users/logout-all', userController.verifyToken, userController.logoutAllSessions);
app.post('/api/users/refresh-token', userController.verifyToken, userController.refreshToken);

// ===============================
// PROFILE ROUTES
// ===============================

app.get('/api/profiles/:userId', profileController.getProfile);
app.post('/api/profiles/:userId', userController.verifyToken, profileController.createProfile);
app.put('/api/profiles/:userId', userController.verifyToken, profileController.updateProfile);
app.post('/api/profiles/:userId/picture', userController.verifyToken, upload.single('profilePicture'), profileController.updateProfilePicture);
app.delete('/api/profiles/:userId', userController.verifyToken, profileController.deleteProfile);
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
// MAP ROUTES
// ===============================

// Location API Routes
app.get('/locations', mapController.getAllLocations);
app.get('/locations/:user_id', mapMiddleware.validateUserId, mapController.getLocationByUser);
app.post('/locations', mapMiddleware.validateUserId, mapMiddleware.validateLocationData, mapController.saveLocation);
app.put('/locations/:user_id/:location_id', mapMiddleware.validateUserId, mapMiddleware.validateLocationId, mapMiddleware.validateLocationData, mapController.updateLocation);
app.delete('/locations/:user_id/:location_id', mapMiddleware.validateUserId, mapMiddleware.validateLocationId, mapController.deleteLocation);

// Routes API
app.get('/routes', mapController.getAllRoutes);
app.get('/routes/:user_id', mapMiddleware.validateUserId, mapController.getRoutesByUser);
app.post('/routes', mapMiddleware.validateUserId, mapMiddleware.validateRouteData, mapController.saveRoute);
app.put('/routes/:user_id/:route_id', mapMiddleware.validateUserId, mapMiddleware.validateRouteId, mapMiddleware.validateRouteNameUpdate, mapController.updateRoute);
app.delete('/routes/:user_id/:route_id', mapMiddleware.validateUserId, mapMiddleware.validateRouteId, mapController.deleteRoute);



// ===============================
// SETTINGS ROUTES
// ===============================

// Settings validation schema
const settingsSchema = Joi.object({
  language: Joi.string().required(),
  fontSize: Joi.string().valid('small', 'medium', 'large', 'xlarge').required(),
  theme: Joi.string().valid('light', 'dark', 'system').required(),
  timeFormat: Joi.string().valid('12h', '24h').required()
});

app.get('/api/settings/:userId', async (req, res) => {
  try {
    await sql.connect(dbConfig);
    const result = await sql.query`SELECT * FROM Settings WHERE userId = ${req.params.userId}`;
    res.json(result.recordset[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings/:userId', async (req, res) => {
  const { error } = settingsSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  
  const { language, fontSize, theme, timeFormat } = req.body;
    try {
      await sql.query`
        MERGE Settings AS target
        USING (SELECT ${req.params.userId} AS userId) AS source
        ON (target.userId = source.userId)
    WHEN MATCHED THEN
        UPDATE SET language=${language}, fontSize=${fontSize}, theme=${theme}, timeFormat=${timeFormat}
    WHEN NOT MATCHED THEN
        INSERT (userId, language, fontSize, theme, timeFormat)
        VALUES (${req.params.userId}, ${language}, ${fontSize}, ${theme}, ${timeFormat});
    `;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Try to load settings routes if available
try {
  const settingsRoutes = require('./backend/settings');
  app.use('/api/settings', settingsRoutes);
  console.log('✅ External Settings API routes registered');
} catch (error) {
  console.log('⚠️ External settings routes not found, using built-in routes');
}

// ===============================
// APPOINTMENT ROUTES
// ===============================

// Get polyclinics
app.get('/api/polyclinics', 
  AppointmentMiddleware.logAppointmentActivity,
  AppointmentController.getPolyclinics
);

// Get doctors for a polyclinic
app.get('/api/polyclinics/:id/doctors',
  AppointmentMiddleware.validateAppointmentId,
  AppointmentMiddleware.logAppointmentActivity,
  AppointmentController.getPolyclinicDoctors
);

// Get available time slots
app.get('/api/appointments/available-slots',
  AppointmentMiddleware.validateDateParameter,
  AppointmentMiddleware.logAppointmentActivity,
  AppointmentController.getAvailableSlots
);

// Get appointment statistics
app.get('/api/appointments/stats',
  AppointmentMiddleware.logAppointmentActivity,
  AppointmentController.getAppointmentStats
);

// Get specific appointment by ID
app.get('/api/appointments/:id',
  AppointmentMiddleware.validateAppointmentId,
  AppointmentMiddleware.logAppointmentActivity,
  AppointmentController.getAppointmentById
);

// Create new appointment 
app.post('/api/appointments/book',
  AppointmentMiddleware.logAppointmentActivity,
  AppointmentMiddleware.rateLimitAppointments,
  AppointmentMiddleware.validateAppointmentData,
  AppointmentMiddleware.checkBusinessHours,
  AppointmentController.createAppointment
);

// Update appointment
app.put('/api/appointments/:id',
  AppointmentMiddleware.validateAppointmentId,
  AppointmentMiddleware.logAppointmentActivity,
  AppointmentController.updateAppointment
);

// Delete appointment
app.delete('/api/appointments/:id',
  AppointmentMiddleware.validateAppointmentId,
  AppointmentMiddleware.logAppointmentActivity,
  AppointmentController.deleteAppointment
);

// Legacy appointment routes
app.get('/api/appointments', async (req, res) => {
  try {
    await AppointmentController.getAppointments(req, res);
  } catch (error) {
    const { date } = req.query;
    try {
      await sql.connect(dbConfig);
      const result = await sql.query`SELECT * FROM Appointments WHERE AppointmentDate = ${date}`;
      res.json(result.recordset);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
});

app.post('/api/appointments', async (req, res) => {
  res.status(410).json({ 
    success: false, 
    message: 'This endpoint has been deprecated. Please use /api/appointments/book for new appointments.' 
  });
});

// ===============================
// TEXT-TO-SPEECH ROUTES
// ===============================

app.use('/api/tts', ttsRoutes);

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

// Add error handling middleware for specific routes
app.use('/api/appointments', AppointmentMiddleware.handleErrors);
app.use('/api/polyclinics', AppointmentMiddleware.handleErrors);

// Catch-all route for debugging 404s
app.use('*', (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    message: 'Combined Multi-Feature Server',
    availableFeatures: {
      authentication: [
        'POST /auth/register',
        'POST /auth/login',
        'POST /auth/logout',
        'GET /auth/me'
      ],
      users: [
        'POST /api/users/signup',
        'POST /api/users/login',
        'GET /api/users/search',
        'GET /api/users/:userId'
      ],
      profiles: [
        'GET /api/profiles/:userId',
        'POST /api/profiles/:userId',
        'PUT /api/profiles/:userId',
        'POST /api/profiles/:userId/picture'
      ],
      social: [
        'POST /api/statuses',
        'GET /api/statuses/recent',
        'POST /api/friends/request',
        'GET /api/friends/:userId'
      ],
      map: [
        'GET /locations',
        'POST /locations',
        'GET /routes',
        'POST /routes',
        'GET /map/config'
      ],
      appointments: [
        'GET /api/polyclinics',
        'POST /api/appointments/book',
        'GET /api/appointments/:id'
      ],
      settings: [
        'GET /api/settings/:userId',
        'POST /api/settings/:userId'
      ],
      tts: [
        'POST /api/tts/convert',
        'GET /api/tts/voices'
      ],
      pages: [
        'GET / (home)',
        'GET /login',
        'GET /register',
        'GET /profile',
        'GET /map',
        'GET /settings'
      ],
      utilities: [
        'GET /test',
        'GET /health',
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
    console.log('🔌 Connecting to database...');
    await sql.connect(dbConfig);
    console.log('✅ Database connected successfully');
    
    app.listen(PORT, () => {
      console.log(`🚀 Combined Multi-Feature Server running on http://localhost:${PORT}`);
      console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                     AVAILABLE FEATURES                        ║
╠═══════════════════════════════════════════════════════════════╣
║ 🏠 Home Page:           http://localhost:${PORT}/                  ║
║ 👤 User Authentication: http://localhost:${PORT}/login            ║
║ 📊 User Profiles:       http://localhost:${PORT}/profile          ║
║ 🗺️  Interactive Maps:    http://localhost:${PORT}/map             ║
║ 👥 Social Features:     http://localhost:${PORT}/friends          ║
║ 📅 Appointments:        http://localhost:${PORT}/appointment      ║
║ ⚙️  Settings:            http://localhost:${PORT}/settings        ║
║ 🎮 Matchmaking:         http://localhost:${PORT}/matchmaking      ║
║ 🔊 Text-to-Speech:      http://localhost:${PORT}/tts              ║
║ 📚 API Documentation:   http://localhost:${PORT}/api-docs         ║
║ 🏥 Health Check:        http://localhost:${PORT}/health           ║
║ 🧪 Test Endpoint:       http://localhost:${PORT}/test             ║
╚═══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Combined Multi-Feature Server is gracefully shutting down...');
  try {
    await sql.close();
    console.log('✅ Database connections closed');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }
  console.log('👋 Server stopped gracefully');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  try {
    await sql.close();
    console.log('✅ Database connections closed');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }
  console.log('👋 Server stopped gracefully');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
