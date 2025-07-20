module.exports = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT),
  trustServerCertificate: true,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectionTimeout: 60000, // Connection timeout in milliseconds
  },
};