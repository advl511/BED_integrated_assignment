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
      VALUES (${user.username}, ${user.email}, ${hash}, ${salt}, ${user.phone_number}, ${user.race}, ${user.age}, ${user.first_name}, ${user.last_name}, ${user.gender}, ${user.date_of_birth}, ${user.nationality})
    `;
    return result;
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

module.exports = {
  createUser,
  findUserByEmail,
  findUserByUsername,
};