const mapModel = require('../model/mapmodel');
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

async function updateLocation(req, res) {
    try {
        const { location_id, user_id } = req.params;
        const { name, latitude, longitude } = req.body;
        
        const location = { name, latitude, longitude };
        const result = await mapModel.updateLocation(location_id, user_id, location);
        
        if (result) {
            res.status(200).json({
                success: true,
                message: "Location updated successfully",
                data: { location_id, ...location, user_id }
            });
        } else {
            res.status(404).json({
                success: false,
                error: "Location not found",
                message: "No location found with the specified ID for this user"
            });
        }
    } catch (error) {
        console.error('Error updating location:', error);
        res.status(500).json({
            success: false,
            error: "Error updating location",
            message: error.message
        });
    }
}

async function deleteLocation(req, res) {
    try {
        const { location_id, user_id } = req.params;
        
        const result = await mapModel.deleteLocation(location_id, user_id);
        
        if (result) {
            res.status(200).json({
                success: true,
                message: "Location deleted successfully"
            });
        } else {
            res.status(404).json({
                success: false,
                error: "Location not found",
                message: "No location found with the specified ID for this user"
            });
        }
    } catch (error) {
        console.error('Error deleting location:', error);
        res.status(500).json({
            success: false,
            error: "Error deleting location",
            message: error.message
        });
    }
}

async function getAllRoutes(req, res) {
    try {
        const routes = await mapModel.getAllRoutes();
        res.status(200).json({
            success: true,
            count: routes.length,
            data: routes
        });
    } catch (error) {
        console.error('Error fetching all routes:', error);
        res.status(500).json({
            success: false,
            error: "Unable to fetch routes",
            message: error.message
        });
    }
}

async function getRoutesByUser(req, res) {
    const user_id = req.params.user_id;
    try {
        const routes = await mapModel.getRoutesByUser(user_id);
        if (routes.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No routes found for this user"
            });
        }
        res.status(200).json({
            success: true,
            count: routes.length,
            data: routes
        });
    } catch (error) {
        console.error('Error fetching routes by user:', error);
        res.status(500).json({
            success: false,
            error: "Unable to fetch routes for user",
            message: error.message
        });
    }
}

async function saveRoute(req, res) {
    try {
        // Data has already been validated by middleware
        const { name, start_lat, start_lng, end_lat, end_lng, user_id } = req.body;
        
        const route = { name, start_lat, start_lng, end_lat, end_lng };
        const result = await mapModel.saveRoute(route, user_id);
        
        if (result) {
            res.status(201).json({
                success: true,
                message: "Route saved successfully",
                data: { ...route, user_id }
            });
        } else {
            res.status(500).json({
                success: false,
                error: "Failed to save route",
                message: "Database operation returned false"
            });
        }
    } catch (error) {
        console.error('Error saving route:', error);
        res.status(500).json({
            success: false,
            error: "Error saving route",
            message: error.message
        });
    }
}

async function updateRoute(req, res) {
    try {
        const { route_id, user_id } = req.params;
        const { name } = req.body;
        
        const result = await mapModel.updateRoute(route_id, user_id, name);
        
        if (result) {
            res.status(200).json({
                success: true,
                message: "Route updated successfully",
                data: { route_id, user_id, name }
            });
        } else {
            res.status(404).json({
                success: false,
                error: "Route not found",
                message: "No route found with the specified ID for this user"
            });
        }
    } catch (error) {
        console.error('Error updating route:', error);
        res.status(500).json({
            success: false,
            error: "Error updating route",
            message: error.message
        });
    }
}

async function deleteRoute(req, res) {
    try {
        const { route_id, user_id } = req.params;
        
        const result = await mapModel.deleteRoute(route_id, user_id);
        
        if (result) {
            res.status(200).json({
                success: true,
                message: "Route deleted successfully"
            });
        } else {
            res.status(404).json({
                success: false,
                error: "Route not found",
                message: "No route found with the specified ID for this user"
            });
        }
    } catch (error) {
        console.error('Error deleting route:', error);
        res.status(500).json({
            success: false,
            error: "Error deleting route",
            message: error.message
        });
    }
}
async function getAllNearbyEvents(req, res) {
    try {
        const events = await mapModel.getAllNearbyEvents();
        res.status(200).json({
            success: true,
            count: events.length,
            data: events
        });
    } catch (error) {
        console.error('Error fetching all nearby events:', error);
        res.status(500).json({
            success: false,
            error: "Unable to fetch nearby events",
            message: error.message
        });
    }
}

async function saveNearbyEvent(req, res) {
    try {
        // Data has already been validated by middleware
        const { location_name, latitude, longitude, event_info, user_id } = req.body;
        
        const event = { location_name, latitude, longitude, event_info };
        const result = await mapModel.saveNearbyEvent(event, user_id);
        
        if (result.success) {
            res.status(201).json({
                success: true,
                message: "Nearby event saved successfully",
                data: { 
                    location_id: result.location_id,
                    ...event, 
                    user_id 
                }
            });
        } else {
            res.status(500).json({
                success: false,
                error: "Failed to save nearby event",
                message: "Database operation failed"
            });
        }
    } catch (error) {
        console.error('Error saving nearby event:', error);
        res.status(500).json({
            success: false,
            error: "Error saving nearby event",
            message: error.message
        });
    }
}

async function updateNearbyEvent(req, res) {
    try {
        const { location_id, user_id } = req.params;
        const { location_name, latitude, longitude, event_info } = req.body;
        
        const event = { location_name, latitude, longitude, event_info };
        const result = await mapModel.updateNearbyEvent(location_id, user_id, event);
        
        if (result) {
            res.status(200).json({
                success: true,
                message: "Nearby event updated successfully",
                data: { location_id, ...event, user_id }
            });
        } else {
            res.status(404).json({
                success: false,
                error: "Nearby event not found",
                message: "No nearby event found with the specified ID for this user"
            });
        }
    } catch (error) {
        console.error('Error updating nearby event:', error);
        res.status(500).json({
            success: false,
            error: "Error updating nearby event",
            message: error.message
        });
    }
}

async function updateEventInfo(req, res) {
    try {
        const { location_id, user_id } = req.params;
        const { event_info } = req.body;
        
        const result = await mapModel.updateEventInfo(location_id, user_id, event_info);
        
        if (result) {
            res.status(200).json({
                success: true,
                message: "Event info updated successfully",
                data: { location_id, user_id, event_info }
            });
        } else {
            res.status(404).json({
                success: false,
                error: "Nearby event not found",
                message: "No nearby event found with the specified ID for this user"
            });
        }
    } catch (error) {
        console.error('Error updating event info:', error);
        res.status(500).json({
            success: false,
            error: "Error updating event info",
            message: error.message
        });
    }
}

async function deleteNearbyEvent(req, res) {
    try {
        const { location_id, user_id } = req.params;
        
        const result = await mapModel.deleteNearbyEvent(location_id, user_id);
        
        if (result) {
            res.status(200).json({
                success: true,
                message: "Nearby event deleted successfully"
            });
        } else {
            res.status(404).json({
                success: false,
                error: "Nearby event not found",
                message: "No nearby event found with the specified ID for this user"
            });
        }
    } catch (error) {
        console.error('Error deleting nearby event:', error);
        res.status(500).json({
            success: false,
            error: "Error deleting nearby event",
            message: error.message
        });
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
    deleteRoute,
    getAllNearbyEvents,
    saveNearbyEvent,
    updateNearbyEvent,
    updateEventInfo,
    deleteNearbyEvent
}