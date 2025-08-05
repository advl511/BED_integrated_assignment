const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config(); // Load environment variables
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Make io accessible to routes
app.set('io', io);

const userController = require('./Controller/userController');
const profileController = require('./Controller/profileController');
const statusController = require('./Controller/statusController');
const friendsController = require('./Controller/friendsController');
const chatController = require('./Controller/chatController');
const { validateSignup, validateLogin } = require('./Middleware/userMiddleware');
const { verifyToken } = userController;
const sql = require('mssql');
const config = require('./dbConfig');

const port = process.env.PORT || 3000;

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

app.use(express.json());
app.use(cookieParser());

// Serve static files from the 'pages' directory
app.use(express.static(path.join(__dirname, 'pages')));
app.use('/styles', express.static(path.join(__dirname, 'styles')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// Chat routes
app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'chat.html'));
});

// API routes for chat
app.post('/api/chat/send', verifyToken, chatController.sendMessage);
app.get('/api/chat/messages', verifyToken, chatController.getMessages);
app.get('/api/chat/messages/new', verifyToken, chatController.getNewMessages);

// Serve static files from the backend directory (for JS files)
app.use(express.static('./backend'));
// Serve static files from the pages directory  
app.use(express.static('./pages'));
// Serve static files from the styles directory
app.use(express.static('./styles'));

// Add request logging for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Cookies:', req.cookies);
  next();
});

app.get('/', (req, res) => {
  // Redirect to signin page in pages folder
  res.redirect('/signin.html');
});

// Test route to verify server is working
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working', timestamp: new Date().toISOString() });
});

// Specific route for profile.html for debugging
app.get('/profile.html', (req, res) => {
  console.log('Profile.html route accessed');
  res.sendFile(path.join(__dirname, 'pages', 'profile.html'));
});

// Public routes (no authentication required)
app.post('/api/users/signup', validateSignup, userController.registerUser);
app.post('/api/users/login', validateLogin, userController.loginUser);

// Check if email or username exists (public routes for registration validation)
app.get('/api/users/check-email/:email', userController.checkEmailExists);
app.get('/api/users/check-username/:username', userController.checkUsernameExists);

// User search
app.get('/api/users/search', userController.searchUsers);

// User profile routes
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

// Profile routes
app.get('/api/profiles/:userId', profileController.getProfile);
app.post('/api/profiles/:userId', profileController.createProfile);
app.put('/api/profiles/:userId', profileController.updateProfile);
app.post('/api/profiles/:userId/picture', upload.single('profilePicture'), profileController.updateProfilePicture);
app.delete('/api/profiles/:userId', profileController.deleteProfile);
app.get('/api/profiles/search', profileController.searchProfiles);

// Status routes
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

// Friends routes
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
      'GET /api/users/search',
      'GET /api/users/:userId',
      'PUT /api/users/:userId',
      'GET /api/users/profile (Protected - requires JWT token)',
      'GET /api/users/verify-token (Protected - requires JWT token)',
      'POST /api/users/logout (Protected - requires JWT token)',
      'POST /api/users/logout-all (Protected - requires JWT token)',
      'POST /api/users/refresh-token (Protected - requires JWT token)',
      'GET /api/profiles/:userId',
      'POST /api/profiles/:userId',
      'PUT /api/profiles/:userId',
      'POST /api/profiles/:userId/picture',
      'DELETE /api/profiles/:userId',
      'GET /api/profiles/search',
      'POST /api/statuses',
      'POST /api/statuses/with-attachments',
      'GET /api/statuses/recent',
      'GET /api/statuses/search',
      'GET /api/statuses/:userId',
      'GET /api/statuses/:userId/count',
      'GET /api/status/:statusId',
      'PUT /api/statuses/:statusId',
      'DELETE /api/statuses/:statusId',
      'GET /api/feed/:userId',
      'POST /api/friends/request',
      'PUT /api/friends/accept/:requestId',
      'PUT /api/friends/reject/:requestId',
      'GET /api/friends/:userId',
      'GET /api/friends/:userId/pending',
      'GET /api/friends/:userId/sent',
      'DELETE /api/friends/:userId/:friendId',
      'GET /api/friends/:userId/:friendId/status',
      'GET /api/friends/:userId/count',
      'GET /api/friends/:userId1/:userId2/mutual'
    ]
  });
});

// Start server
async function startServer() {
  try {
    // Initialize database connection
    console.log('Connecting to database...');
    await sql.connect(config);
    console.log('Database connected successfully');
    
    // WebSocket connection handling
    io.on('connection', (socket) => {
      console.log('New client connected');
      
      // Handle user joining a chat room
      socket.on('join', (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined the chat`);
      });
      
      // Handle typing indicator
      socket.on('typing', (data) => {
        socket.broadcast.emit('typing', data);
      });
      
      socket.on('disconnect', () => {
        console.log('Client disconnected');
      });
    });

    server.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Server is gracefully shutting down");
  await sql.close();
  console.log("Database connections closed");
  process.exit(0);
});
