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
                name: name ? "✓" : "✗",
                latitude: latitude !== undefined ? "✓" : "✗", 
                longitude: longitude !== undefined ? "✓" : "✗"
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
    const { id } = req.params;
    
    if (!id) {
        return res.status(400).json({
            error: "Missing location ID",
            message: "Location ID is required in the URL path"
        });
    }

    const locationId = parseInt(id, 10);
    if (isNaN(locationId) || locationId <= 0) {
        return res.status(400).json({
            error: "Invalid location ID",
            message: "Location ID must be a positive integer",
            received: id
        });
    }

    req.params.id = locationId;
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

module.exports = {
    validateLocationData,
    validateLocationId,
    validateUserId,
    handleValidationErrors,
    validateContentType,
    validateSingaporeCoordinates
};
