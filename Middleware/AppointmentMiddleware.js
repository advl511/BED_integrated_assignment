const jwt = require('jsonwebtoken');

class AppointmentMiddleware {
    
    // Middleware to verify JWT token 
    static authenticateToken(req, res, next) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access token required' 
            });
        }

        jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key', (err, user) => {
            if (err) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Invalid or expired token' 
                });
            }
            req.user = user;
            next();
        });
    }

    // Middleware to validate appointment data
    static validateAppointmentData(req, res, next) {
        console.log('validateAppointmentData req.body:', req.body);
        const {appointmentDate, appointmentTime, reason } = req.body;
        const errors = [];

        // Validate appointment date
        if (!appointmentDate) {
            errors.push('Appointment date is required');
        } else {
            const date = new Date(appointmentDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (isNaN(date.getTime())) {
                errors.push('Invalid appointment date format');
            } else if (date < today) {
                errors.push('Appointment date cannot be in the past');
            }
            
            // Check if date is too far in the future (e.g., 6 months)
            const maxDate = new Date();
            maxDate.setMonth(maxDate.getMonth() + 6);
            if (date > maxDate) {
                errors.push('Appointment date cannot be more than 6 months in advance');
            }
        }

        // Validate appointment time
        if (!appointmentTime) {
            errors.push('Appointment time is required');
        } else {
            const validTimes = [
                '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
                '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
            ];
            
            if (!validTimes.includes(appointmentTime)) {
                errors.push('Invalid appointment time selected');
            }
        }

        // Validate reason
        if (!reason || reason.trim().length === 0) {
            errors.push('Reason for appointment is required');
        } else if (reason.trim().length < 10) {
            errors.push('Please provide a more detailed reason (at least 10 characters)');
        } else if (reason.trim().length > 500) {
            errors.push('Reason is too long (maximum 500 characters)');
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors
            });
        }

        req.body.reason = reason.trim();
        
        next();
    }

    // Middleware to validate appointment ID parameter
    static validateAppointmentId(req, res, next) {
        const { id } = req.params;
        
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({
                success: false,
                message: 'Valid appointment ID is required'
            });
        }

        req.params.id = parseInt(id);
        next();
    }

    // Middleware to validate date parameter
    static validateDateParameter(req, res, next) {
        const { date } = req.query;
        
        if (date) {
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid date format. Use YYYY-MM-DD format.'
                });
            }
        }
        
        next();
    }

    // Middleware to validate pagination parameters
    static validatePagination(req, res, next) {
        let { page, limit } = req.query;
        
        // Set defaults
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        
        // Validate ranges
        if (page < 1) {
            page = 1;
        }
        
        if (limit < 1 || limit > 100) {
            limit = 10;
        }
        
        req.query.page = page;
        req.query.limit = limit;
        
        next();
    }

    // Middleware to validate status parameter
    static validateStatusParameter(req, res, next) {
        const { status } = req.query;
        
        if (status) {
            const validStatuses = ['Confirmed', 'Pending', 'Cancelled', 'Completed', 'No-show'];
            
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status. Valid statuses are: ' + validStatuses.join(', ')
                });
            }
        }
        
        next();
    }

    // Middleware to check business hours
    static checkBusinessHours(req, res, next) {
        const { appointmentDate, appointmentTime } = req.body;
        
        if (appointmentDate && appointmentTime) {
            const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
            const dayOfWeek = appointmentDateTime.getDay(); // 0 = Sunday, 6 = Saturday
            
            // Check if it's a weekend (assuming clinic is closed on weekends)
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Appointments are not available on weekends. Please select a weekday.'
                });
            }
            
            // Check if it's a public holiday
            const publicHolidays = [
                '2025-01-01', // New Year's Day
                '2025-01-29', // Chinese New Year
                '2025-01-30', // Chinese New Year
                '2025-04-18', // Good Friday
                '2025-05-01', // Labour Day
                '2025-05-12', // Vesak Day
                '2025-06-16', // Hari Raya Puasa
                '2025-08-09', // National Day
                '2025-08-23', // Hari Raya Haji
                '2025-10-26', // Deepavali
                '2025-12-25'  // Christmas Day
            ];
            
            const appointmentDateStr = appointmentDate;
            if (publicHolidays.includes(appointmentDateStr)) {
                return res.status(400).json({
                    success: false,
                    message: 'Appointments are not available on public holidays. Please select another date.'
                });
            }
        }
        
        next();
    }

    // Middleware for rate limiting 
    static rateLimitAppointments(req, res, next) {
        
        const clientIP = req.ip || req.connection.remoteAddress;
        const currentTime = Date.now();
        
        // Store in memory 
        if (!req.app.locals.rateLimitStore) {
            req.app.locals.rateLimitStore = new Map();
        }
        
        const store = req.app.locals.rateLimitStore;
        const clientData = store.get(clientIP) || { count: 0, resetTime: currentTime + 60000 }; // 1 minute window
        
        if (currentTime > clientData.resetTime) {
            // Reset the counter
            clientData.count = 0;
            clientData.resetTime = currentTime + 60000;
        }
        
        if (clientData.count >= 5) { 
            return res.status(429).json({
                success: false,
                message: 'Too many appointment requests. Please try again later.'
            });
        }
        
        clientData.count++;
        store.set(clientIP, clientData);
        
        next();
    }

    // Middleware to log appointment activities
    static logAppointmentActivity(req, res, next) {
        const { method, originalUrl, ip } = req;
        const timestamp = new Date().toISOString();
        
        console.log(`[${timestamp}] ${method} ${originalUrl} - IP: ${ip}`); 
        next();
    }

    // Error handling middleware
    static handleErrors(err, req, res, next) {
        console.error('Appointment API Error:', err);
        
        if (err.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                details: err.message
            });
        }
        
        if (err.name === 'DatabaseError') {
            return res.status(500).json({
                success: false,
                message: 'Database operation failed'
            });
        }
        
        // Default error response
        res.status(500).json({
            success: false,
            message: 'An unexpected error occurred'
        });
    }
}

module.exports = AppointmentMiddleware;