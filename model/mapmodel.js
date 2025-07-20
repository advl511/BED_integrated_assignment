const sql = require('mssql');
const dbConfig = require('../dbConfig');

class MapModel {
    constructor() {
        this.pool = null;
    }

    async connect() {
        try {
            if (!this.pool) {
                this.pool = await sql.connect(dbConfig);
                console.log('Connected to SQL Server database');
            }
            return this.pool;
        } catch (error) {
            console.error('Database connection failed:', error);
            throw error;
        }
    }

    async executeQuery(query, params = {}) {
        try {
            const pool = await this.connect();
            const request = pool.request();
            
            Object.keys(params).forEach(key => {
                request.input(key, params[key]);
            });
            
            const result = await request.query(query);
            return result;
        } catch (error) {
            console.error('Query execution failed:', error);
            throw error;
        }
    }

    // Initialize all tables
    async initializeTables() {
        try {
            // Create saved_locations table
            const locationsQuery = `
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='saved_locations' AND xtype='U')
                CREATE TABLE saved_locations (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    user_id INT NOT NULL DEFAULT 1,
                    location_name NVARCHAR(255) NOT NULL,
                    description NVARCHAR(MAX),
                    latitude DECIMAL(10, 8) NOT NULL,
                    longitude DECIMAL(11, 8) NOT NULL,
                    address NVARCHAR(500),
                    category NVARCHAR(50) DEFAULT 'general',
                    is_favorite BIT DEFAULT 0,
                    is_private BIT DEFAULT 0,
                    tags NVARCHAR(500),
                    visit_count INT DEFAULT 0,
                    last_visited DATETIME,
                    created_at DATETIME DEFAULT GETDATE(),
                    updated_at DATETIME DEFAULT GETDATE()
                )
            `;

            // Create saved_routes table
            const routesQuery = `
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='saved_routes' AND xtype='U')
                CREATE TABLE saved_routes (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    user_id INT NOT NULL DEFAULT 1,
                    route_name NVARCHAR(255) NOT NULL,
                    origin_name NVARCHAR(255) NOT NULL,
                    origin_lat DECIMAL(10, 8) NOT NULL,
                    origin_lng DECIMAL(11, 8) NOT NULL,
                    destination_name NVARCHAR(255) NOT NULL,
                    destination_lat DECIMAL(10, 8) NOT NULL,
                    destination_lng DECIMAL(11, 8) NOT NULL,
                    travel_mode NVARCHAR(20) DEFAULT 'DRIVING',
                    distance_text NVARCHAR(50),
                    duration_text NVARCHAR(50),
                    route_polyline NVARCHAR(MAX),
                    waypoints NVARCHAR(MAX),
                    created_at DATETIME DEFAULT GETDATE()
                )
            `;

            await this.executeQuery(locationsQuery);
            await this.executeQuery(routesQuery);
            
            console.log('All tables initialized successfully');
        } catch (error) {
            console.error('Error initializing tables:', error);
            throw error;
        }
    }

    // Get all locations (for backward compatibility)
    async getAllLocations() {
        return this.getUserLocations(1); // Default user
    }

    // Save a location for a user
    async saveUserLocation(userId, location) {
        try {
            const query = `
                INSERT INTO saved_locations (
                    user_id, location_name, description, latitude, longitude, 
                    address, category, is_favorite, is_private, tags
                )
                OUTPUT INSERTED.id
                VALUES (@userId, @locationName, @description, @latitude, @longitude, 
                        @address, @category, @isFavorite, @isPrivate, @tags)
            `;
            
            const params = {
                userId: userId,
                locationName: location.name || location.location_name || 'Saved Location',
                description: location.description || '',
                latitude: location.lat || location.latitude,
                longitude: location.lng || location.longitude,
                address: location.address || '',
                category: location.category || 'general',
                isFavorite: location.isFavorite || false,
                isPrivate: location.isPrivate || false,
                tags: location.tags || ''
            };
            
            const result = await this.executeQuery(query, params);
            return result.recordset[0];
        } catch (error) {
            console.error('Error saving user location:', error);
            throw error;
        }
    }

    // Get all locations for a user
    async getUserLocations(userId) {
        try {
            const query = `
                SELECT id, location_name, description, latitude, longitude, 
                       address, category, is_favorite, is_private, tags,
                       visit_count, last_visited, created_at, updated_at
                FROM saved_locations
                WHERE user_id = @userId
                ORDER BY created_at DESC
            `;
            
            const params = { userId };
            const result = await this.executeQuery(query, params);
            return result.recordset;
        } catch (error) {
            console.error('Error fetching user locations:', error);
            throw error;
        }
    }

    // Save a route
    async saveRoute(userId, routeData) {
        try {
            const query = `
                INSERT INTO saved_routes (
                    user_id, route_name, origin_name, origin_lat, origin_lng,
                    destination_name, destination_lat, destination_lng, 
                    travel_mode, distance_text, duration_text, route_polyline,
                    waypoints
                )
                OUTPUT INSERTED.id
                VALUES (@userId, @routeName, @originName, @originLat, @originLng,
                        @destinationName, @destinationLat, @destinationLng,
                        @travelMode, @distanceText, @durationText, @routePolyline,
                        @waypoints)
            `;
            
            const params = {
                userId: userId,
                routeName: routeData.name || routeData.route_name || 'Saved Route',
                originName: routeData.origin?.name || 'Origin',
                originLat: routeData.origin?.lat || 0,
                originLng: routeData.origin?.lng || 0,
                destinationName: routeData.destination?.name || 'Destination',
                destinationLat: routeData.destination?.lat || 0,
                destinationLng: routeData.destination?.lng || 0,
                travelMode: routeData.travelMode || 'DRIVING',
                distanceText: routeData.distance || '',
                durationText: routeData.duration || '',
                routePolyline: JSON.stringify(routeData.polyline) || '',
                waypoints: JSON.stringify(routeData.waypoints || [])
            };
            
            const result = await this.executeQuery(query, params);
            return result.recordset[0];
        } catch (error) {
            console.error('Error saving route:', error);
            throw error;
        }
    }

    // Get user's saved routes
    async getUserRoutes(userId) {
        try {
            const query = `
                SELECT id, route_name, origin_name, origin_lat, origin_lng,
                       destination_name, destination_lat, destination_lng,
                       travel_mode, distance_text, duration_text, 
                       route_polyline, waypoints, created_at
                FROM saved_routes
                WHERE user_id = @userId
                ORDER BY created_at DESC
            `;
            
            const params = { userId };
            const result = await this.executeQuery(query, params);
            return result.recordset;
        } catch (error) {
            console.error('Error fetching user routes:', error);
            throw error;
        }
    }

    // Get route by ID
    async getRouteById(userId, routeId) {
        try {
            const query = `
                SELECT id, route_name, origin_name, origin_lat, origin_lng,
                       destination_name, destination_lat, destination_lng,
                       travel_mode, distance_text, duration_text, 
                       route_polyline, waypoints, created_at
                FROM saved_routes
                WHERE id = @routeId AND user_id = @userId
            `;
            
            const params = { userId, routeId };
            const result = await this.executeQuery(query, params);
            return result.recordset[0];
        } catch (error) {
            console.error('Error fetching route by ID:', error);
            throw error;
        }
    }
}

module.exports = new MapModel();