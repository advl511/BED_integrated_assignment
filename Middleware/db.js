const sql = require('mssql');



const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: true
    }
};

const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

const query = async (sqlQuery, params = {}) => {
    await poolConnect;
    const request = pool.request();
    for (const key in params) {
        request.input(key, params[key].type, params[key].value);
    }
    return request.query(sqlQuery);
};

module.exports = { query };
