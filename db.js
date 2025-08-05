// db.js
const sql = require('mssql');
const config = require('./dbConfig');

let pool;

const connectDB = async () => {
  try {
    if (!pool) {
      pool = await sql.connect(config);
      console.log("✅ Connected to SQL Server");
    }
    return pool;
  } catch (err) {
    console.error("❌ DB connection error:", err.message);
    throw err;
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  try {
    if (pool) {
      await pool.close();
      console.log('Database connection closed.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error closing database connection:', err);
    process.exit(1);
  }
});

module.exports = { sql, connectDB, getPool: () => pool };
