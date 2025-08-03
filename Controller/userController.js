const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../Model/userModel.js');

// JWT Secret - In production, this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Generate JWT token
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: '24h' // Token expires in 24 hours
  });
}

// Verify JWT token middleware (now checks cookies and database)
function verifyToken(req, res, next) {
  // Try to get token from cookie first, then fallback to Authorization header
  let token = req.cookies?.auth_token;
  
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      token = authHeader.split(' ')[1];
    }
  }
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  // First verify JWT structure
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Then check if token exists and is valid in database
    userModel.validateUserToken(token)
      .then(tokenRecord => {
        if (!tokenRecord) {
          return res.status(401).json({ error: 'Token is invalid or expired.' });
        }
        
        // Add user info to request object
        req.user = {
          user_id: tokenRecord.user_id,
          username: tokenRecord.username,
          email: tokenRecord.email
        };
        req.token = token; // Store token for potential logout
        next();
      })
      .catch(error => {
        console.error('Database token validation error:', error);
        return res.status(401).json({ error: 'Token validation failed.' });
      });
      
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired.' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    } else {
      return res.status(401).json({ error: 'Token verification failed.' });
    }
  }
}

async function registerUser(req, res) {
  try {
    console.log('Registration request received:', req.body);
    const { username, email, password } = req.body;
    
    // Check if email already exists
    const existingEmail = await userModel.findUserByEmail(email);
    if (existingEmail) return res.status(400).json({ error: 'Email already exists' });
    
    // Check if username already exists
    const existingUsername = await userModel.findUserByUsername(username);
    if (existingUsername) return res.status(400).json({ error: 'Username already exists' });

    const newUser = {
      username: username,
      email,
      password,
      phone_number: 'N/A',
      race: 'N/A',
      age: 0,
      first_name: 'N/A',
      last_name: 'N/A',
      gender: 'Prefer not to say',
      date_of_birth: '2000-01-01',
      nationality: 'N/A'
    };
    const newUserId = await userModel.createUser(newUser);
    
    // Generate JWT token for the new user
    const token = generateToken({
      user_id: newUserId,
      username: username,
      email: email
    });
    
    // Store token in database
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    await userModel.storeUserToken(newUserId, token, expiresAt);
    
    // Set HTTP-only cookie instead of returning token
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    res.status(201).json({ 
      message: 'User registered successfully',
      user: {
        user_id: newUserId,
        username: username,
        email: email
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function loginUser(req, res) {
  try {
    const { username, email, password } = req.body;
    
    // Accept either username or email for login
    const loginIdentifier = username || email;
    
    // Find user by username if provided, otherwise try email
    let user = null;
    if (username) {
      user = await userModel.findUserByUsername(username);
    }
    
    // If not found by username, try by email
    if (!user && email) {
      user = await userModel.findUserByEmail(email);
    }
    
    // If still not found, try to find by email using the loginIdentifier
    if (!user) {
      user = await userModel.findUserByEmail(loginIdentifier);
    }
    
    // If still not found, try to find by username using the loginIdentifier
    if (!user) {
      user = await userModel.findUserByUsername(loginIdentifier);
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken({
      user_id: user.user_id,
      username: user.username,
      email: user.email
    });

    // Store token in database
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    await userModel.storeUserToken(user.user_id, token, expiresAt);

    // Set HTTP-only cookie instead of returning token
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.status(200).json({ 
      message: 'Login successful',
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function checkEmailExists(req, res) {
  try {
    const { email } = req.params;
    const user = await userModel.findUserByEmail(email);
    res.json({ exists: !!user });
  } catch (err) {
    console.error('Check email error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function checkUsernameExists(req, res) {
  try {
    const { username } = req.params;
    const user = await userModel.findUserByUsername(username);
    res.json({ exists: !!user });
  } catch (err) {
    console.error('Check username error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function logoutUser(req, res) {
  try {
    const token = req.token; // Get token from middleware
    
    // Invalidate token in database
    await userModel.invalidateUserToken(token);
    
    // Clear the HTTP-only cookie
    res.clearCookie('auth_token');
    
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function logoutAllSessions(req, res) {
  try {
    const userId = req.user.user_id;
    
    // Invalidate all tokens for this user
    await userModel.invalidateAllUserTokens(userId);
    
    // Clear the HTTP-only cookie
    res.clearCookie('auth_token');
    
    res.json({ message: 'Logged out from all sessions successfully' });
  } catch (err) {
    console.error('Logout all sessions error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function refreshToken(req, res) {
  try {
    const oldToken = req.token;
    const user = req.user;
    
    // Generate new token
    const newToken = generateToken({
      user_id: user.user_id,
      username: user.username,
      email: user.email
    });
    
    // Store new token and invalidate old one
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await userModel.storeUserToken(user.user_id, newToken, expiresAt);
    await userModel.invalidateUserToken(oldToken);
    
    // Set new HTTP-only cookie
    res.cookie('auth_token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });
    
    res.json({
      message: 'Token refreshed successfully',
      user: user
    });
  } catch (err) {
    console.error('Token refresh error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  registerUser,
  loginUser,
  checkEmailExists,
  checkUsernameExists,
  logoutUser,
  logoutAllSessions,
  refreshToken,
  verifyToken,
  generateToken
};