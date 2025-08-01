const sql = require('mssql');
const bcrypt = require('bcrypt');
const config = require('./dbConfig');

async function createUser(user) {
  try {
    await sql.connect(config);
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(user.password, salt);

    const result = await sql.query`
      INSERT INTO users (username, email, password_hash, salt, phone_number, race, age, first_name, last_name, gender, date_of_birth, nationality)
      OUTPUT INSERTED.user_id
      VALUES (${user.username}, ${user.email}, ${hash}, ${salt}, ${user.phone_number}, ${user.race}, ${user.age}, ${user.first_name}, ${user.last_name}, ${user.gender}, ${user.date_of_birth}, ${user.nationality})
    `;
    return result.recordset[0].user_id; // Return the actual user ID
  } catch (err) {
    throw err;
  }
}

async function findUserByEmail(email) {
  try {
    await sql.connect(config);
    const result = await sql.query`SELECT * FROM users WHERE email = ${email}`;
    return result.recordset[0];
  } catch (err) {
    throw err;
  }
}

async function findUserByUsername(username) {
  try {
    await sql.connect(config);
    const result = await sql.query`SELECT * FROM users WHERE username = ${username}`;
    return result.recordset[0];
  } catch (err) {
    throw err;
  }
}

// JWT Token management functions
async function storeUserToken(userId, token, expiresAt) {
  try {
    await sql.connect(config);
    // First, invalidate any existing tokens for this user
    await sql.query`UPDATE user_tokens SET is_active = 0 WHERE user_id = ${userId}`;
    
    // Insert new token
    const result = await sql.query`
      INSERT INTO user_tokens (user_id, token, expires_at, is_active, created_at)
      VALUES (${userId}, ${token}, ${expiresAt}, 1, GETDATE())
    `;
    return result;
  } catch (err) {
    throw err;
  }
}

async function validateUserToken(token) {
  try {
    await sql.connect(config);
    const result = await sql.query`
      SELECT ut.*, u.user_id, u.username, u.email 
      FROM user_tokens ut
      INNER JOIN users u ON ut.user_id = u.user_id
      WHERE ut.token = ${token} 
      AND ut.is_active = 1 
      AND ut.expires_at > GETDATE()
    `;
    return result.recordset[0];
  } catch (err) {
    throw err;
  }
}

async function invalidateUserToken(token) {
  try {
    await sql.connect(config);
    const result = await sql.query`
      UPDATE user_tokens 
      SET is_active = 0 
      WHERE token = ${token}
    `;
    return result;
  } catch (err) {
    throw err;
  }
}

async function invalidateAllUserTokens(userId) {
  try {
    await sql.connect(config);
    const result = await sql.query`
      UPDATE user_tokens 
      SET is_active = 0 
      WHERE user_id = ${userId}
    `;
    return result;
  } catch (err) {
    throw err;
  }
}

async function cleanupExpiredTokens() {
  try {
    await sql.connect(config);
    const result = await sql.query`
      DELETE FROM user_tokens 
      WHERE expires_at < GETDATE() OR is_active = 0
    `;
    return result;
  } catch (err) {
    throw err;
  }
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserByUsername,
  storeUserToken,
  validateUserToken,
  invalidateUserToken,
  invalidateAllUserTokens,
  cleanupExpiredTokens,
};