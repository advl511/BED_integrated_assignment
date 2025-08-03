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

async function getAllRoutes(){
    let connection
    try {
        connection = await sql.connect(dbConfig)
        const result = await connection.request().query(
            'SELECT * FROM user_routes');
        return result.recordset;
    } catch (error) {
        console.error('Error fetching routes:', error);
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

async function getRoutesByUser(user_id){
    let connection
    try {
        connection = await sql.connect(dbConfig)
        const query = 'SELECT * FROM user_routes WHERE user_id = @user_id';
        const request = connection.request();
        request.input('user_id', user_id);
        const result = await request.query(query);
        return result.recordset;
    } catch (error) {
        console.error('Error fetching routes by user:', error);
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

async function saveRoute(route, user_id = 1) {
    let connection
    try {
        connection = await sql.connect(dbConfig)
        const query = 
            'INSERT INTO user_routes (user_id, route_name, start_lat, start_lng, end_lat, end_lng) VALUES (@user_id, @route_name, @start_lat, @start_lng, @end_lat, @end_lng)';
        const request = connection.request();
        request.input('user_id', user_id);
        request.input('route_name', route.name);
        request.input('start_lat', route.start_lat);
        request.input('start_lng', route.start_lng);
        request.input('end_lat', route.end_lat);
        request.input('end_lng', route.end_lng);
        const result = await request.query(query);

        return result.rowsAffected[0] > 0;
    } catch (error) {
        console.error('Error saving route:', error);
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

async function updateRoute(route_id, user_id, new_route_name) {
    let connection
    try {
        connection = await sql.connect(dbConfig)
        const query = 
            'UPDATE user_routes SET route_name = @route_name WHERE route_id = @route_id AND user_id = @user_id';
        const request = connection.request();
        request.input('route_id', route_id);
        request.input('user_id', user_id);
        request.input('route_name', new_route_name);
        const result = await request.query(query);

        return result.rowsAffected[0] > 0;
    } catch (error) {
        console.error('Error updating route:', error);
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

async function deleteRoute(route_id, user_id) {
    let connection
    try {
        connection = await sql.connect(dbConfig)
        const query = 
            'DELETE FROM user_routes WHERE route_id = @route_id AND user_id = @user_id';
        const request = connection.request();
        request.input('route_id', route_id);
        request.input('user_id', user_id);
        const result = await request.query(query);

        return result.rowsAffected[0] > 0;
    } catch (error) {
        console.error('Error deleting route:', error);
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

async function updateLocation(location_id, user_id, location) {
    let connection
    try {
        connection = await sql.connect(dbConfig)
        const query = 
            'UPDATE user_saved_locations SET location_name = @location_name, latitude = @latitude, longitude = @longitude, updated_at = GETDATE() WHERE location_id = @location_id AND user_id = @user_id';
        const request = connection.request();
        request.input('location_id', location_id);
        request.input('user_id', user_id);
        request.input('location_name', location.name);
        request.input('latitude', location.latitude);
        request.input('longitude', location.longitude);
        const result = await request.query(query);

        return result.rowsAffected[0] > 0;
    } catch (error) {
        console.error('Error updating location:', error);
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

async function deleteLocation(location_id, user_id) {
    let connection
    try {
        connection = await sql.connect(dbConfig)
        const query = 
            'DELETE FROM user_saved_locations WHERE location_id = @location_id AND user_id = @user_id';
        const request = connection.request();
        request.input('location_id', location_id);
        request.input('user_id', user_id);
        const result = await request.query(query);

        return result.rowsAffected[0] > 0;
    } catch (error) {
        console.error('Error deleting location:', error);
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
    saveLocation,
    updateLocation,
    deleteLocation,
    getAllRoutes,
    getRoutesByUser,
    saveRoute,
    updateRoute,
    deleteRoute
}