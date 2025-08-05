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

// Helper function to determine if request is from Live Server
function isLiveServerOrigin(req) {
  const origin = req.headers.origin;
  return origin && (
    origin.includes('127.0.0.1:5500') || 
    origin.includes('localhost:5500') ||
    origin.includes('127.0.0.1:5501') || 
    origin.includes('localhost:5501') ||
    origin.includes('127.0.0.1:5502') || 
    origin.includes('localhost:5502') ||
    origin.includes('127.0.0.1:5503') || 
    origin.includes('localhost:5503')
  );
}

async function registerUser(req, res) {
  try {
    console.log('Registration request received:', req.body);
    const { username, email, password } = req.body;
    
    // Check if email already exists
    console.log('Checking if email exists:', email);
    const existingEmail = await userModel.findUserByEmail(email);
    if (existingEmail) {
      console.log('Email already exists:', email);
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    // Check if username already exists
    console.log('Checking if username exists:', username);
    const existingUsername = await userModel.findUserByUsername(username);
    if (existingUsername) {
      console.log('Username already exists:', username);
      return res.status(400).json({ error: 'Username already exists' });
    }

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
    
    console.log('Creating user with data:', { ...newUser, password: '[HIDDEN]' });
    const newUserId = await userModel.createUser(newUser);
    console.log('User created successfully with ID:', newUserId);
    
    // Generate JWT token for the new user
    const token = generateToken({
      user_id: newUserId,
      username: username,
      email: email
    });
    
    // Store token in database
    console.log('Storing token for user:', newUserId);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    await userModel.storeUserToken(newUserId, token, expiresAt);
    console.log('Token stored successfully');
    
    // Check if request is from Live Server - if so, return token in response
    if (isLiveServerOrigin(req)) {
      console.log('🌐 Live Server detected - returning token in response');
      res.status(201).json({ 
        message: 'User registered successfully',
        token: token, // Include token for Live Server
        user: {
          user_id: newUserId,
          username: username,
          email: email
        }
      });
    } else {
      // Set HTTP-only cookie for same-origin requests
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      
      console.log('🎉 Registration completed successfully for user:', username);
      res.status(201).json({ 
        message: 'User registered successfully',
        user: {
          user_id: newUserId,
          username: username,
          email: email
        }
      });
    }
  } catch (err) {
    console.error('💥 Registration error:', err);
    console.error('💥 Error stack:', err.stack);
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

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
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

    // Check if request is from Live Server - if so, return token in response
    if (isLiveServerOrigin(req)) {
      console.log('🌐 Live Server detected - returning token in response for login');
      res.status(200).json({ 
        message: 'Login successful',
        token: token, // Include token for Live Server
        user: {
          user_id: user.user_id,
          username: user.username,
          email: user.email
        }
      });
    } else {
      // Set HTTP-only cookie for same-origin requests
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
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
    }
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
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
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

async function searchUsers(req, res) {
  try {
    const { q: query, limit = 10 } = req.query;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const users = await userModel.searchUsers(query.trim(), parseInt(limit));
    res.status(200).json(users);
  } catch (err) {
    console.error('Search users error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function getUserProfile(req, res) {
  try {
    const { userId } = req.params;
    
    const user = await userModel.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Remove sensitive information
    const { password_hash, salt, ...userProfile } = user;
    res.status(200).json(userProfile);
  } catch (err) {
    console.error('Get user profile error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function updateUserProfile(req, res) {
  try {
    const { userId } = req.params;
    const userData = req.body;
    
    // Validate that the user can only update their own profile
    if (req.user && parseInt(req.user.user_id) !== parseInt(userId)) {
      return res.status(403).json({ error: 'You can only update your own profile' });
    }
    
    // Check if user exists
    const existingUser = await userModel.getUserById(userId);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Separate fields for users table vs profiles table
    const userFields = ['race', 'gender', 'date_of_birth', 'nationality'];
    const profileFields = ['first_name', 'age', 'phone_number'];
    
    const userUpdateData = {};
    const profileUpdateData = {};
    
    // Route fields to appropriate tables
    Object.keys(userData).forEach(field => {
      if (userFields.includes(field)) {
        userUpdateData[field] = userData[field];
      } else if (profileFields.includes(field)) {
        profileUpdateData[field] = userData[field];
      }
    });
    
    console.log('User table updates:', userUpdateData);
    console.log('Profile table updates:', profileUpdateData);
    
    let updatedUser = null;
    let updatedProfile = null;
    
    // Update users table if needed (without OUTPUT clause to avoid trigger issues)
    if (Object.keys(userUpdateData).length > 0) {
      updatedUser = await userModel.updateUserWithoutOutput(userId, userUpdateData);
    }
    
    // Update profiles table if needed
    if (Object.keys(profileUpdateData).length > 0) {
      const profileModel = require('../Model/profileModel');
      updatedProfile = await profileModel.updateProfile(userId, profileUpdateData);
    }
    
    // Get the updated user data
    const finalUser = await userModel.getUserById(userId);
    const { password_hash, salt, ...userProfile } = finalUser;
    
    res.status(200).json(userProfile);
  } catch (err) {
    console.error('💥 Update user profile error:', err);
    console.error('💥 Error message:', err.message);
    console.error('💥 Error stack:', err.stack);
    console.error('💥 User ID:', req.params.userId);
    console.error('💥 Request body:', req.body);
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
  generateToken,
  searchUsers,
  getUserProfile,
  updateUserProfile
};