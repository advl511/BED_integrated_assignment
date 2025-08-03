const sql = require('mssql');
const bcrypt = require('bcrypt');
const config = require('../dbConfig');

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

async function searchUsers(query, limit = 10) {
  try {
    await sql.connect(config);
    const result = await sql.query`
      SELECT user_id, username, email, first_name, last_name
      FROM users 
      WHERE username LIKE ${'%' + query + '%'} 
         OR first_name LIKE ${'%' + query + '%'} 
         OR last_name LIKE ${'%' + query + '%'}
         OR email LIKE ${'%' + query + '%'}
      ORDER BY username
      OFFSET 0 ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `;
    return result.recordset;
  } catch (err) {
    throw err;
  }
}

async function getUserById(userId) {
  try {
    await sql.connect(config);
    const result = await sql.query`
      SELECT user_id, username, email, first_name, last_name, phone_number, 
             race, age, gender, date_of_birth, nationality, created_at
      FROM users 
      WHERE user_id = ${userId}
    `;
    return result.recordset[0];
  } catch (err) {
    throw err;
  }
}

async function updateUser(userId, userData) {
  try {
    await sql.connect(config);
    
    // Build dynamic SET clause for only provided fields
    const setFields = [];
    const values = { userId };
    
    if (userData.username !== undefined) {
      setFields.push('username = @username');
      values.username = userData.username;
    }
    if (userData.email !== undefined) {
      setFields.push('email = @email');
      values.email = userData.email;
    }
    if (userData.first_name !== undefined) {
      setFields.push('first_name = @firstName');
      values.firstName = userData.first_name;
    }
    if (userData.last_name !== undefined) {
      setFields.push('last_name = @lastName');
      values.lastName = userData.last_name;
    }
    if (userData.phone_number !== undefined) {
      setFields.push('phone_number = @phoneNumber');
      values.phoneNumber = userData.phone_number;
    }
    if (userData.race !== undefined) {
      setFields.push('race = @race');
      values.race = userData.race;
    }
    if (userData.age !== undefined) {
      setFields.push('age = @age');
      values.age = userData.age;
    }
    if (userData.gender !== undefined) {
      setFields.push('gender = @gender');
      values.gender = userData.gender;
    }
    if (userData.date_of_birth !== undefined) {
      setFields.push('date_of_birth = @dateOfBirth');
      values.dateOfBirth = userData.date_of_birth;
    }
    if (userData.nationality !== undefined) {
      setFields.push('nationality = @nationality');
      values.nationality = userData.nationality;
    }
    
    if (setFields.length === 0) {
      throw new Error('No fields to update');
    }
    
    const query = `
      UPDATE users 
      SET ${setFields.join(', ')}
      OUTPUT INSERTED.*
      WHERE user_id = @userId
    `;
    
    const request = new sql.Request();
    Object.keys(values).forEach(key => {
      request.input(key, values[key]);
    });
    
    const result = await request.query(query);
    return result.recordset[0];
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
  searchUsers,
  getUserById,
  updateUser,
};