const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
const userController = require('./userController');
const { validateSignup, validateLogin } = require('./validateInput');
const { verifyToken } = userController;
const sql = require('mssql');

const port = process.env.PORT || 3000;

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

app.use(express.json());
app.use(cookieParser());

// Add request logging for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Cookies:', req.cookies);
  next();
});

app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Public routes (no authentication required)
app.post('/api/users/signup', validateSignup, userController.registerUser);
app.post('/api/users/login', validateLogin, userController.loginUser);

// Check if email or username exists (public routes for registration validation)
app.get('/api/users/check-email/:email', userController.checkEmailExists);
app.get('/api/users/check-username/:username', userController.checkUsernameExists);

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

// Catches route for debugging 404s
app.use('*', (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      'GET /',
      'POST /api/users/signup',
      'POST /api/users/login',
      'GET /api/users/check-email/:email',
      'GET /api/users/check-username/:username',
      'GET /api/users/profile (Protected - requires JWT token)',
      'GET /api/users/verify-token (Protected - requires JWT token)',
      'POST /api/users/logout (Protected - requires JWT token)',
      'POST /api/users/logout-all (Protected - requires JWT token)',
      'POST /api/users/refresh-token (Protected - requires JWT token)'
    ]
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Server is gracefully shutting down");
  await sql.close();
  console.log("Database connections closed");
  process.exit(0);
});
