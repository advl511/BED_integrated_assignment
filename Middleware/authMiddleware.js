const jwt = require('jsonwebtoken');
const { sql } = require('mssql');
const dbConfig = require('../dbConfig');

/**
 * Middleware to authenticate JWT token
 * Verifies the token from the Authorization header
 * and attaches the decoded user to the request object
 */
const authenticateToken = async (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    
    // Get user from database to ensure they still exist
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('userId', sql.Int, decoded.userId)
      .query('SELECT user_id, username, email, role FROM users WHERE user_id = @userId');
    
    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user to request object
    req.user = result.recordset[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Authentication error:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

module.exports = {
  authenticateToken
};
