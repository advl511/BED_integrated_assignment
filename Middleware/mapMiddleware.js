// Validation middleware for location data
const validateLocationData = (req, res, next) => {
    const { name, latitude, longitude } = req.body;
    
    // Check if all required fields are present
    if (!name || latitude === undefined || longitude === undefined) {
        return res.status(400).json({
            error: "Missing required fields",
            message: "Name, latitude, and longitude are required",
            required: ["name", "latitude", "longitude"],
            received: {
                name: name ? "PROVIDED" : "MISSING",
                latitude: latitude !== undefined ? "PROVIDED" : "MISSING", 
                longitude: longitude !== undefined ? "PROVIDED" : "MISSING"
            }
        });
    }

    // Validate name
    if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
            error: "Invalid name",
            message: "Name must be a non-empty string"
        });
    }

    if (name.trim().length > 255) {
        return res.status(400).json({
            error: "Invalid name",
            message: "Name must be 255 characters or less"
        });
    }

    // Validate latitude
    const lat = parseFloat(latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
        return res.status(400).json({
            error: "Invalid latitude",
            message: "Latitude must be a number between -90 and 90",
            received: latitude
        });
    }

    // Validate longitude
    const lng = parseFloat(longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({
            error: "Invalid longitude", 
            message: "Longitude must be a number between -180 and 180",
            received: longitude
        });
    }

    // Sanitize and normalize data
    req.body.name = name.trim();
    req.body.latitude = lat;
    req.body.longitude = lng;

    next();
};

// Validation middleware for route parameters (location ID)
const validateLocationId = (req, res, next) => {
    const { location_id } = req.params;
    
    if (!location_id) {
        return res.status(400).json({
            error: "Missing location ID",
            message: "Location ID is required in the URL path"
        });
    }

    const locationId = parseInt(location_id, 10);
    if (isNaN(locationId) || locationId <= 0) {
        return res.status(400).json({
            error: "Invalid location ID",
            message: "Location ID must be a positive integer",
            received: location_id
        });
    }

    req.params.location_id = locationId;
    next();
};

// Validation middleware for user ID (from query params, body, or route params)
const validateUserId = (req, res, next) => {
    // Initialize params, query, and body if they don't exist
    if (!req.params) req.params = {};
    if (!req.query) req.query = {};
    if (!req.body) req.body = {};
    
    // Check route params first, then query params, then body for user_id
    let userId = req.params.user_id || req.query.user_id || req.body.user_id;
    
    // If no user_id provided, use default value of 1 for testing
    if (!userId) {
        userId = 1;
    }

    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId) || parsedUserId <= 0) {
        return res.status(400).json({
            error: "Invalid user ID",
            message: "User ID must be a positive integer",
            received: userId
        });
    }

    // Add validated user_id to request for consistency
    req.params.user_id = parsedUserId;
    req.query.user_id = parsedUserId;
    req.body.user_id = parsedUserId;
    
    next();
};

// Error handling middleware
const handleValidationErrors = (error, req, res, next) => {
    console.error('Validation error:', error);
    
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({
            error: "Invalid JSON",
            message: "Request body must be valid JSON"
        });
    }
    
    if (error.type === 'entity.too.large') {
        return res.status(413).json({
            error: "Request too large",
            message: "Request body exceeds size limit"
        });
    }
    
    // Default error response
    res.status(500).json({
        error: "Internal server error",
        message: "An unexpected error occurred during validation"
    });
};

// Middleware to check request content type for POST/PUT requests
const validateContentType = (req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT') {
        if (!req.is('application/json')) {
            return res.status(415).json({
                error: "Unsupported Media Type",
                message: "Content-Type must be application/json",
                received: req.get('Content-Type') || 'none'
            });
        }
    }
    next();
};

const validateSingaporeCoordinates = (req, res, next) => {
    const { latitude, longitude } = req.body;
    
    // Singapore bounds (approximate)
    const SINGAPORE_BOUNDS = {
        minLat: 1.1496,
        maxLat: 1.4784,
        minLng: 103.5942,
        maxLng: 104.0885
    };
    
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (lat < SINGAPORE_BOUNDS.minLat || lat > SINGAPORE_BOUNDS.maxLat ||
        lng < SINGAPORE_BOUNDS.minLng || lng > SINGAPORE_BOUNDS.maxLng) {
        
        console.warn(`Coordinates outside Singapore bounds: ${lat}, ${lng}`);
    }
    
    next();
};

// Validation middleware for route data
const validateRouteData = (req, res, next) => {
    const { name, start_lat, start_lng, end_lat, end_lng } = req.body;
    
    // Check if all required fields are present
    if (!name || start_lat === undefined || start_lng === undefined || 
        end_lat === undefined || end_lng === undefined) {
        return res.status(400).json({
            error: "Missing required fields",
            message: "Name, start_lat, start_lng, end_lat, and end_lng are required",
            required: ["name", "start_lat", "start_lng", "end_lat", "end_lng"],
            received: {
                name: name ? "PROVIDED" : "MISSING",
                start_lat: start_lat !== undefined ? "PROVIDED" : "MISSING",
                start_lng: start_lng !== undefined ? "PROVIDED" : "MISSING",
                end_lat: end_lat !== undefined ? "PROVIDED" : "MISSING",
                end_lng: end_lng !== undefined ? "PROVIDED" : "MISSING"
            }
        });
    }

    // Validate name
    if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
            error: "Invalid name",
            message: "Name must be a non-empty string"
        });
    }

    if (name.trim().length > 255) {
        return res.status(400).json({
            error: "Invalid name",
            message: "Name must be 255 characters or less"
        });
    }

    // Validate start latitude
    const startLat = parseFloat(start_lat);
    if (isNaN(startLat) || startLat < -90 || startLat > 90) {
        return res.status(400).json({
            error: "Invalid start latitude",
            message: "Start latitude must be a number between -90 and 90",
            received: start_lat
        });
    }

    // Validate start longitude
    const startLng = parseFloat(start_lng);
    if (isNaN(startLng) || startLng < -180 || startLng > 180) {
        return res.status(400).json({
            error: "Invalid start longitude",
            message: "Start longitude must be a number between -180 and 180",
            received: start_lng
        });
    }

    // Validate end latitude
    const endLat = parseFloat(end_lat);
    if (isNaN(endLat) || endLat < -90 || endLat > 90) {
        return res.status(400).json({
            error: "Invalid end latitude",
            message: "End latitude must be a number between -90 and 90",
            received: end_lat
        });
    }

    // Validate end longitude
    const endLng = parseFloat(end_lng);
    if (isNaN(endLng) || endLng < -180 || endLng > 180) {
        return res.status(400).json({
            error: "Invalid end longitude",
            message: "End longitude must be a number between -180 and 180",
            received: end_lng
        });
    }

    // Sanitize and normalize data
    req.body.name = name.trim();
    req.body.start_lat = startLat;
    req.body.start_lng = startLng;
    req.body.end_lat = endLat;
    req.body.end_lng = endLng;

    next();
};

// Validation middleware for route ID
const validateRouteId = (req, res, next) => {
    const { route_id } = req.params;
    
    if (!route_id) {
        return res.status(400).json({
            error: "Missing route ID",
            message: "Route ID is required in the URL path"
        });
    }

    const routeId = parseInt(route_id, 10);
    if (isNaN(routeId) || routeId <= 0) {
        return res.status(400).json({
            error: "Invalid route ID",
            message: "Route ID must be a positive integer",
            received: route_id
        });
    }

    req.params.route_id = routeId;
    next();
};

// Validation middleware for route name update
const validateRouteNameUpdate = (req, res, next) => {
    const { name } = req.body;
    
    if (!name) {
        return res.status(400).json({
            error: "Missing route name",
            message: "Route name is required for update"
        });
    }

    // Validate name
    if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
            error: "Invalid name",
            message: "Name must be a non-empty string"
        });
    }

    if (name.trim().length > 255) {
        return res.status(400).json({
            error: "Invalid name",
            message: "Name must be 255 characters or less"
        });
    }

    req.body.name = name.trim();
    next();
};
// Validation middleware for nearby events data
const validateEventData = (req, res, next) => {
    const { location_name, latitude, longitude, event_info } = req.body;
    
    // Check if all required fields are present
    if (!location_name || latitude === undefined || longitude === undefined) {
        return res.status(400).json({
            error: "Missing required fields",
            message: "Location name, latitude, and longitude are required",
            required: ["location_name", "latitude", "longitude"],
            received: {
                location_name: location_name ? "PROVIDED" : "MISSING",
                latitude: latitude !== undefined ? "PROVIDED" : "MISSING", 
                longitude: longitude !== undefined ? "PROVIDED" : "MISSING"
            }
        });
    }

    // Validate location_name
    if (typeof location_name !== 'string' || location_name.trim().length === 0) {
        return res.status(400).json({
            error: "Invalid location name",
            message: "Location name must be a non-empty string"
        });
    }

    if (location_name.trim().length > 100) {
        return res.status(400).json({
            error: "Invalid location name",
            message: "Location name must be 100 characters or less"
        });
    }

    // Validate latitude
    const lat = parseFloat(latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
        return res.status(400).json({
            error: "Invalid latitude",
            message: "Latitude must be a number between -90 and 90",
            received: latitude
        });
    }

    // Validate longitude
    const lng = parseFloat(longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({
            error: "Invalid longitude", 
            message: "Longitude must be a number between -180 and 180",
            received: longitude
        });
    }

    // Validate event_info if provided (optional field)
    if (event_info !== undefined && event_info !== null) {
        if (typeof event_info !== 'string') {
            return res.status(400).json({
                error: "Invalid event info",
                message: "Event info must be a string"
            });
        }
        if (event_info.length > 10000) {
            return res.status(400).json({
                error: "Invalid event info",
                message: "Event info must be 10,000 characters or less"
            });
        }
    }

    // Sanitize and normalize data
    req.body.location_name = location_name.trim();
    req.body.latitude = lat;
    req.body.longitude = lng;
    req.body.event_info = event_info ? event_info.trim() : null;

    next();
};

// Validation middleware for event location ID
const validateEventLocationId = (req, res, next) => {
    const { location_id } = req.params;
    
    if (!location_id) {
        return res.status(400).json({
            error: "Missing location ID",
            message: "Location ID is required in the URL path"
        });
    }

    const locationId = parseInt(location_id, 10);
    if (isNaN(locationId) || locationId <= 0) {
        return res.status(400).json({
            error: "Invalid location ID",
            message: "Location ID must be a positive integer",
            received: location_id
        });
    }

    req.params.location_id = locationId;
    next();
};

// Validation middleware for event info update
const validateEventInfoUpdate = (req, res, next) => {
    const { event_info } = req.body;
    
    if (event_info !== undefined && event_info !== null) {
        if (typeof event_info !== 'string') {
            return res.status(400).json({
                error: "Invalid event info",
                message: "Event info must be a string"
            });
        }
        
        if (event_info.length > 10000) {
            return res.status(400).json({
                error: "Invalid event info",
                message: "Event info must be 10,000 characters or less"
            });
        }
        
        req.body.event_info = event_info.trim();
    }
    
    next();
};

module.exports = {
    validateLocationData,
    validateLocationId,
    validateUserId,
    handleValidationErrors,
    validateContentType,
    validateSingaporeCoordinates,
    validateRouteData,
    validateRouteId,
    validateRouteNameUpdate,
    validateEventData,
    validateEventLocationId,
    validateEventInfoUpdate
};