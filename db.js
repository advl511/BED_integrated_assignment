// db.js
const sql = require('mssql');
const config = require('./dbConfig');

sql.connect(config)
  .then(() => console.log("✅ Connected to SQL Server"))
  .catch((err) => {
    console.error("❌ DB connection error:", err);
  });

module.exports = { sql };
