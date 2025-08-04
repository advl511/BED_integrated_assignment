require("dotenv").config(); // ✅ Required at the top

const sql = require("mssql");

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true // ✅ Needed for local dev
  }
};

module.exports = {
  sql,
  config
};
