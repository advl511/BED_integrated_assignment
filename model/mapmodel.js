const sql = require('mssql');
const dbConfig = require('../dbConfig');

async function getAllLocations() {
    let connection;
    try {
        connection = await sql.connect(dbConfig);
        const result = await connection.request().query(
            'SELECT * FROM user_saved_locations');
        console.log(result);
        return result.recordset;
    } catch (err) {
        console.error('SQL error', err);
        throw err;
    }
}

module.exports = {
    getAllLocations
};