require('dotenv').config();
const express = require("express");
const sql = require("mssql");
const Joi = require("joi");
const path = require("path");
const dbConfig = require("./dbconfig.js");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "Public")));

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

// --- APPOINTMENTS CRUD ---
const appointmentSchema = Joi.object({
    date: Joi.string().isoDate().required(),
    type: Joi.string().max(100).required(),
    time: Joi.string().max(20).required(),
    doctor: Joi.string().max(100).required(),
    status: Joi.string().max(50).required()
});

app.get('/api/appointments', async (req, res) => {
    const { date } = req.query;
    try {
        await sql.connect(dbConfig);
        const result = await sql.query`SELECT * FROM Appointments WHERE date = ${date}`;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/appointments', async (req, res) => {
    const { error } = appointmentSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { date, type, time, doctor, status } = req.body;
    try {
        await sql.connect(dbConfig);
        await sql.query`
            INSERT INTO appointments (date, type, time, doctor, status)
            VALUES (${date}, ${type}, ${time}, ${doctor}, ${status})
        `;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/appointments/:id', async (req, res) => {
    const { error } = appointmentSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { id } = req.params;
    const { date, type, time, doctor, status } = req.body;
    try {
        await sql.connect(dbConfig);
        await sql.query`
            UPDATE appointments
            SET date=${date}, type=${type}, time=${time}, doctor=${doctor}, status=${status}
            WHERE id=${id}
        `;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/appointments/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await sql.connect(dbConfig);
        await sql.query`DELETE FROM Appointments WHERE id=${id}`;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

