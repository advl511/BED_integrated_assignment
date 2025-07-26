const sql = require('mssql')
const dbConfig = require('../dbConfig')

async function getAllLocations(){
    let connection
    try {
        connection = await sql.connect(dbConfig)
        const result = await connection.request().query(
            'SELECT * FROM user_saved_locations');
        return result.recordset;
    } catch (error) {
        console.error('Error fetching locations:', error);
        throw error;
    } finally {
        if (connection) {
            try{
                await connection.close();
            } catch (err){
                console.error('Error closing connection:', err);
            }
        }
    }
}

async function getLocationByUser(user_id){
    let connection
    try {
        connection = await sql.connect(dbConfig)
        const query = 'SELECT * FROM user_saved_locations WHERE user_id = @user_id';
        const request = connection.request();
        request.input('user_id', user_id);
        const result = await request.query(query);
        return result.recordset;
    } catch (error) {
        console.error('Error fetching location by user:', error);
        throw error;
    } finally {
        if (connection) {
            try{
                await connection.close();
            } catch (err){
                console.error('Error closing connection:', err);
            }
        }
    }
}

async function saveLocation(location, user_id = 1) {
    let connection
    try {
        connection = await sql.connect(dbConfig)
        const query = 
            'INSERT INTO user_saved_locations (user_id, location_name, latitude, longitude) VALUES (@user_id, @location_name, @latitude, @longitude)';
        const request = connection.request();
        request.input('user_id', user_id);
        request.input('location_name', location.name);
        request.input('latitude', location.latitude);
        request.input('longitude', location.longitude);
        const result = await request.query(query);

        return result.rowsAffected[0] > 0;
    } catch (error) {
        console.error('Error saving location:', error);
        throw error;
    } finally {
        if (connection) {
            try{
                await connection.close();
            } catch (err){
                console.error('Error closing connection:', err);
            }
        }
    }
}

module.exports = {
    getAllLocations,
    getLocationByUser,
    saveLocation
}