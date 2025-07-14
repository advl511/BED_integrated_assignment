const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
    user: process.env.DB_USER || 'bed_user',
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_DATABASE || 'user_management_system',
    options: {
        encrypt: false,  
        trustServerCertificate: true,
        enableArithAbort: true,
        port: parseInt(process.env.DB_PORT) || 1433
    }
};

module.exports = dbConfig;

