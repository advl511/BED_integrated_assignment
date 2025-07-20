const sql = require("mssql");
require("dotenv").config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER, // ✅ This must be a string like "localhost" or "127.0.0.1"
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true, // ✅ required for local dev
  },
};

module.exports = { sql, config };
