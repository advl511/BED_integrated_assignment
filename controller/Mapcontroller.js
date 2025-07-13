const express = require('express');
const router = express.Router();
const mapModel = require('../model/mapmodel');

router.get('/config', async (req, res) => {
    try {
        const config = {
            googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
        };

        if (!config.googleMapsApiKey) {
            return res.status(500).json({ 
                error: 'Google Maps API key not configured' 
            });
        }

        res.json(config);
    } catch (error) {
        console.error('Error loading map configuration:', error);
        res.status(500).json({ 
            error: 'Failed to load map configuration' 
        });
    }
});

// GET /map/locations - Get all locations
router.get('/locations', async (req, res) => {
    try {
        const locations = await mapModel.getAllLocations();
        res.json(locations);
    } catch (error) {
        console.error('Error fetching locations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;