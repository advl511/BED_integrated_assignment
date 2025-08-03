const express = require('express');
const app = express();
const userController = require('./userController');
const { validateSignup, validateLogin } = require('./validateInput');
const sql = require('mssql');

const port = process.env.PORT || 3000;

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
      'GET /api/users/check-username/:username'
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
