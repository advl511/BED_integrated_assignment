const mapModel = require('../model/mapModel');
const dbConfig = require("../dbConfig");

async function getAllLocations(req, res) {
    try {
        const locations = await mapModel.getAllLocations();
        res.status(200).json({
            success: true,
            count: locations.length,
            data: locations
        });
    } catch (error) {
        console.error('Error fetching all locations:', error);
        res.status(500).json({
            success: false,
            error: "Unable to fetch locations",
            message: error.message
        });
    }
}

async function getLocationByUser(req, res) {
    const user_id = req.params.user_id;
    try {
        const locations = await mapModel.getLocationByUser(user_id);
        if (locations.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No locations found for this user"
            });
        }
        res.status(200).json({
            success: true,
            count: locations.length,
            data: locations
        });
    } catch (error) {
        console.error('Error fetching location by user:', error);
        res.status(500).json({
            success: false,
            error: "Unable to fetch location for user",
            message: error.message
        });
    }
}

async function saveLocation(req, res) {
    try {
        // Data has already been validated by middleware
        const { name, latitude, longitude, user_id } = req.body;
        
        const location = { name, latitude, longitude };
        const result = await mapModel.saveLocation(location, user_id);
        
        if (result) {
            res.status(201).json({
                success: true,
                message: "Location saved successfully",
                data: { ...location, user_id }
            });
        } else {
            res.status(500).json({
                success: false,
                error: "Failed to save location",
                message: "Database operation returned false"
            });
        }
    } catch (error) {
        console.error('Error saving location:', error);
        res.status(500).json({
            success: false,
            error: "Error saving location",
            message: error.message
        });
    }
}

module.exports = {
    getAllLocations,
    getLocationByUser,
    saveLocation
}