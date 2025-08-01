const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const userController = require('./userController');
const profileController = require('./profileController');
const statusController = require('./statusController');
const friendsController = require('./friendsController');
const { validateSignup, validateLogin } = require('./validateInput');
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

// CORS middleware
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

app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Add request logging for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Body:', req.body);
  next();
});

app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

app.post('/api/users/signup', validateSignup, userController.registerUser);
app.post('/api/users/login', validateLogin, userController.loginUser);

// Check if email or username exists
app.get('/api/users/check-email/:email', userController.checkEmailExists);
app.get('/api/users/check-username/:username', userController.checkUsernameExists);

// User search
app.get('/api/users/search', userController.searchUsers);

// User profile routes
app.get('/api/users/:userId', userController.getUserProfile);
app.put('/api/users/:userId', userController.updateUserProfile);

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
      'GET /api/profiles/:userId',
      'POST /api/profiles/:userId',
      'PUT /api/profiles/:userId',
      'POST /api/profiles/:userId/picture',
      'DELETE /api/profiles/:userId',
      'GET /api/profiles/search',
      'POST /api/statuses',
      'GET /api/statuses/:userId',
      'GET /api/status/:statusId',
      'PUT /api/statuses/:statusId',
      'DELETE /api/statuses/:statusId',
      'GET /api/feed/:userId',
      'GET /api/statuses/recent',
      'GET /api/statuses/search',
      'GET /api/statuses/:userId/count',
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
    
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
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
