const express = require('express');
const router = express.Router();
const mapModel = require('../model/mapmodel');
const { validateApiRequest, handleDatabaseErrors } = require('../Middlewares/mapmiddleware');

// Config endpoint
router.get('/config', validateApiRequest, async (req, res) => {
    try {
        const config = {
            googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
        };

        if (!config.googleMapsApiKey) {
            return res.status(500).json({ 
                error: 'Google Maps API key not configured',
                message: 'API key is missing from environment variables'
            });
        }

        const responseTime = Date.now() - req.startTime;
        res.set('X-Response-Time', `${responseTime}ms`);

        res.status(200).json(config);
    } catch (error) {
        console.error('Error loading map configuration:', error);
        res.status(500).json({ 
            error: 'Failed to load map configuration',
            message: 'Unable to retrieve API configuration'
        });
    }
});

// Get all locations
router.get('/locations', validateApiRequest, async (req, res) => {
    try {
        const userId = req.query.userId || 1; // Default user for testing
        const locations = await mapModel.getUserLocations(userId);
        
        const responseTime = Date.now() - req.startTime;
        res.set('X-Response-Time', `${responseTime}ms`);
        
        res.status(200).json(locations || []);
    } catch (error) {
        console.error('Error fetching locations:', error);
        
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({ 
                error: 'Database connection failed',
                message: 'Unable to connect to the database'
            });
        }
        
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to fetch locations'
        });
    }
});

// Save a location
router.post('/locations', validateApiRequest, async (req, res) => {
    try {
        const userId = req.body.userId || 1; // Default user for testing
        const locationData = req.body;
        
        if (!locationData.lat || !locationData.lng) {
            return res.status(400).json({
                error: 'Invalid location data',
                message: 'Latitude and longitude are required'
            });
        }

        const result = await mapModel.saveUserLocation(userId, locationData);
        
        res.status(201).json({
            message: 'Location saved successfully',
            locationId: result.id,
            data: result
        });
    } catch (error) {
        console.error('Error saving location:', error);
        res.status(500).json({
            error: 'Failed to save location',
            message: 'Unable to save location to database'
        });
    }
});

// Get directions (placeholder - actual routing done on frontend)
router.post('/directions', validateApiRequest, async (req, res) => {
    try {
        const { origin, destination, travelMode = 'DRIVING' } = req.body;
        
        if (!origin || !destination) {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'Origin and destination are required'
            });
        }

        res.json({
            message: 'Route calculation request received',
            origin,
            destination,
            travelMode
        });
    } catch (error) {
        console.error('Error processing directions request:', error);
        res.status(500).json({
            error: 'Directions error',
            message: 'Unable to process directions request'
        });
    }
});

// Save a route
router.post('/routes', validateApiRequest, async (req, res) => {
    try {
        const userId = req.body.userId || 1; // Default user for testing
        const routeData = req.body;
        
        const result = await mapModel.saveRoute(userId, routeData);
        
        res.status(201).json({
            message: 'Route saved successfully',
            routeId: result.id
        });
    } catch (error) {
        console.error('Error saving route:', error);
        res.status(500).json({
            error: 'Failed to save route',
            message: 'Unable to save route to database'
        });
    }
});

// Get saved routes
router.get('/routes', validateApiRequest, async (req, res) => {
    try {
        const userId = req.query.userId || 1; // Default user for testing
        const routes = await mapModel.getUserRoutes(userId);
        
        res.json(routes || []);
    } catch (error) {
        console.error('Error fetching routes:', error);
        res.status(500).json({
            error: 'Failed to fetch routes',
            message: 'Unable to retrieve saved routes'
        });
    }
});

// Get specific route by ID
router.get('/routes/:id', validateApiRequest, async (req, res) => {
    try {
        const routeId = req.params.id;
        const userId = req.query.userId || 1;
        
        const route = await mapModel.getRouteById(userId, routeId);
        
        if (!route) {
            return res.status(404).json({
                error: 'Route not found',
                message: 'The requested route does not exist'
            });
        }
        
        res.json(route);
    } catch (error) {
        console.error('Error fetching route:', error);
        res.status(500).json({
            error: 'Failed to fetch route',
            message: 'Unable to retrieve route'
        });
    }
});

module.exports = router;