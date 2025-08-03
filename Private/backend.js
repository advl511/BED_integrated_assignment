require('dotenv').config();
const express = require("express");
const sql = require("mssql");
const Joi = require("joi");
const path = require("path");
const dbConfig = require("./dbconfig.js");

// Import the new appointment components
const AppointmentController = require("../Controller/AppointmentController");
const AppointmentMiddleware = require("../Middleware/AppointmentMiddleware");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "../Public")));

// --- SETTINGS CRUD ---
const settingsSchema = Joi.object({
    showPrayerTimes: Joi.boolean().required(),
    fontSize: Joi.string().valid('font-small', 'font-medium', 'font-large', 'font-extra-large').required(),
    location: Joi.string().required()
});

app.get('/api/settings/:userId', async (req, res) => {
    try {
        await sql.connect(dbConfig);
        const result = await sql.query`SELECT * FROM UserSettings WHERE userId = ${req.params.userId}`;
        res.json(result.recordset[0] || {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings/:userId', async (req, res) => {
    const { error } = settingsSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { showPrayerTimes, fontSize, location } = req.body;
    try {
        await sql.connect(dbConfig);
        await sql.query`
            MERGE UserSettings AS target
            USING (SELECT ${req.params.userId} AS userId) AS source
            ON (target.userId = source.userId)
            WHEN MATCHED THEN
                UPDATE SET showPrayerTimes=${showPrayerTimes}, fontSize=${fontSize}, location=${location}
            WHEN NOT MATCHED THEN
                INSERT (userId, showPrayerTimes, fontSize, location)
                VALUES (${req.params.userId}, ${showPrayerTimes}, ${fontSize}, ${location});
        `;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Get polyclinics
app.get('/api/polyclinics', 
    AppointmentMiddleware.logAppointmentActivity,
    AppointmentController.getPolyclinics
);

// Get doctors for a polyclinic
app.get('/api/polyclinics/:id/doctors',
    AppointmentMiddleware.validateAppointmentId,
    AppointmentMiddleware.logAppointmentActivity,
    AppointmentController.getPolyclinicDoctors
);

// Get available time slots
app.get('/api/appointments/available-slots',
    AppointmentMiddleware.validateDateParameter,
    AppointmentMiddleware.logAppointmentActivity,
    AppointmentController.getAvailableSlots
);

// Get appointment statistics
app.get('/api/appointments/stats',
    AppointmentMiddleware.logAppointmentActivity,
    AppointmentController.getAppointmentStats
);

// Get specific appointment by ID
app.get('/api/appointments/:id',
    AppointmentMiddleware.validateAppointmentId,
    AppointmentMiddleware.logAppointmentActivity,
    AppointmentController.getAppointmentById
);

// Create new appointment 
app.post('/api/appointments/book',
    AppointmentMiddleware.logAppointmentActivity,
    AppointmentMiddleware.rateLimitAppointments,
    AppointmentMiddleware.validateAppointmentData,
    AppointmentMiddleware.checkBusinessHours,
    AppointmentController.createAppointment
);

// Update appointment
app.put('/api/appointments/:id',
    AppointmentMiddleware.validateAppointmentId,
    AppointmentMiddleware.logAppointmentActivity,
    AppointmentController.updateAppointment
);

const appointmentSchema = Joi.object({
    date: Joi.string().isoDate().required(),
    type: Joi.string().max(100).required(),
    time: Joi.string().max(20).required(),
    doctor: Joi.string().max(100).required(),
    status: Joi.string().max(50).required()
});

app.get('/api/appointments', async (req, res) => {
    try {
        await AppointmentController.getAppointments(req, res);
    } catch (error) {
        const { date } = req.query;
        try {
            await sql.connect(dbConfig);
            const result = await sql.query`SELECT * FROM Appointments WHERE AppointmentDate = ${date}`;
            res.json(result.recordset);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
});

app.post('/api/appointments', async (req, res) => {
    res.status(410).json({ 
        success: false, 
        message: 'This endpoint has been deprecated. Please use /api/appointments/book for new appointments.' 
    });
});

app.put('/api/appointments/:id', async (req, res) => {
    try {
        await AppointmentController.updateAppointment(req, res);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/appointments/:id', async (req, res) => {
    try {
        await AppointmentController.deleteAppointment(req, res);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add error handling middleware for appointment routes
app.use('/api/appointments', AppointmentMiddleware.handleErrors);
app.use('/api/polyclinics', AppointmentMiddleware.handleErrors);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});