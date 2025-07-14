const express = require('express');
const router = express.Router();
const mapModel = require('../model/mapmodel');
const { validateApiRequest, handleDatabaseErrors } = require('../middleware/mapmiddleware');

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

        // Add response timing
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

// GET /map/locations - Get all locations
router.get('/locations', validateApiRequest, async (req, res) => {
    try {
        const locations = await mapModel.getAllLocations();
        
        if (!locations || locations.length === 0) {
            return res.status(200).json([]);
        }
        
        // Add response timing
        const responseTime = Date.now() - req.startTime;
        res.set('X-Response-Time', `${responseTime}ms`);
        
        res.status(200).json(locations);
    } catch (error) {
        console.error('Error fetching locations:', error);
        
        // Handle different types of database errors
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({ 
                error: 'Database connection failed',
                message: 'Unable to connect to the database'
            });
        }
        
        if (error.code === 'ETIMEOUT') {
            return res.status(504).json({ 
                error: 'Database timeout',
                message: 'Database query timed out'
            });
        }
        
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to fetch locations'
        });
    }
});

module.exports = router;