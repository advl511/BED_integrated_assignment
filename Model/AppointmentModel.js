const sql = require('mssql');
const dbConfig = require('../dbconfig');

class AppointmentModel {
    
    // Get all appointments for a specific date
    static async getAppointmentsByDate(date) {
        try {
            const pool = await sql.connect(dbConfig);
            const result = await pool.request()
                .input('Date', sql.Date, date)
                .query(`
                    SELECT 
                        a.AppointmentID,
                        a.AppointmentDate,
                        a.AppointmentTime,
                        a.Reason,
                        a.BookingReference,
                        a.Status,
                        a.CreatedDate,
                        a.ModifiedDate,
                        p.PolyclinicName,
                        p.Address as PolyclinicAddress,
                        d.DoctorName,
                        d.Specialization
                    FROM Appointments a
                    JOIN Polyclinics p ON a.PolyclinicID = p.PolyclinicID
                    JOIN Doctors d ON a.DoctorID = d.DoctorID
                    WHERE a.AppointmentDate = @Date
                    ORDER BY a.AppointmentTime
                `);
            
            return result.recordset;
        } catch (error) {
            console.error('Error fetching appointments by date:', error);
            throw error;
        }
    }

    // Get all appointments for a user
    static async getUserAppointments(userId, page = 1, limit = 10, status = null) {
        try {
            const pool = await sql.connect(dbConfig);
            const offset = (page - 1) * limit;
            
            let query = `
                SELECT 
                    a.AppointmentID,
                    a.AppointmentDate,
                    a.AppointmentTime,
                    a.Reason,
                    a.BookingReference,
                    a.Status,
                    a.CreatedDate,
                    a.ModifiedDate,
                    p.PolyclinicName,
                    p.Address as PolyclinicAddress,
                    d.DoctorName,
                    d.Specialization
                FROM Appointments a
                JOIN Polyclinics p ON a.PolyclinicID = p.PolyclinicID
                JOIN Doctors d ON a.DoctorID = d.DoctorID
                WHERE 1=1
            `;
            
            if (userId) {
                query += ` AND a.UserID = @UserID`;
            }
            
            if (status) {
                query += ` AND a.Status = @Status`;
            }
            
            query += `
                ORDER BY a.AppointmentDate DESC, a.AppointmentTime DESC
                OFFSET @Offset ROWS
                FETCH NEXT @Limit ROWS ONLY
            `;
            
            const request = pool.request()
                .input('Offset', sql.Int, offset)
                .input('Limit', sql.Int, limit);
            
            if (userId) {
                request.input('UserID', sql.Int, userId);
            }
            
            if (status) {
                request.input('Status', sql.NVarChar(20), status);
            }
            
            const result = await request.query(query);
            return result.recordset;
        } catch (error) {
            console.error('Error fetching user appointments:', error);
            throw error;
        }
    }

    // Create a new appointment
    static async createAppointment(appointmentData) {
        const transaction = new sql.Transaction();
        
        try {
            const pool = await sql.connect(dbConfig);
            await transaction.begin();
            
            let { polyclinicId, appointmentDate, appointmentTime, reason, userId = 1 } = appointmentData;

            // Always convert to string and pad to HH:mm:ss
            if (typeof appointmentTime === 'string') {
                // If format is HH:mm, convert to HH:mm:ss
                if (/^\d{2}:\d{2}$/.test(appointmentTime)) {
                    appointmentTime = `${appointmentTime}:00`;
                }
                // If format is H:mm, pad to HH:mm:ss
                else if (/^\d{1}:\d{2}$/.test(appointmentTime)) {
                    appointmentTime = `0${appointmentTime}:00`;
                }
                // If format is already HH:mm:ss, do nothing
                else if (!/^\d{2}:\d{2}:\d{2}$/.test(appointmentTime)) {
                    throw new Error('Invalid appointment time format');
                }
            } else {
                throw new Error('Appointment time must be a string');
            }
            
            console.log('Final appointmentTime for SQL:', appointmentTime, typeof appointmentTime);
            
            // Now convert to a Date object at today's date with the correct time
            const [h, m, s] = appointmentTime.split(':');
            appointmentTime = new Date(1970, 0, 1, h, m, s || 0);
            
            // Get available doctors for the polyclinic
            const doctorsResult = await transaction.request()
                .input('PolyclinicID', sql.Int, polyclinicId)
                .query(`
                    SELECT DoctorID, DoctorName, Specialization
                    FROM Doctors 
                    WHERE PolyclinicID = @PolyclinicID AND IsAvailable = 1
                `);
            
            if (doctorsResult.recordset.length === 0) {
                await transaction.rollback();
                throw new Error('No available doctors for this polyclinic');
            }
            
            // Randomly select a doctor
            const doctors = doctorsResult.recordset;
            const selectedDoctor = doctors[Math.floor(Math.random() * doctors.length)];
            
            // Check if the time slot is available
            const conflictCheck = await transaction.request()
                .input('DoctorID', sql.Int, selectedDoctor.DoctorID)
                .input('AppointmentDate', sql.Date, appointmentDate)
                .input('AppointmentTime', sql.Time, appointmentTime)
                .query(`
                    SELECT COUNT(*) as ConflictCount
                    FROM Appointments 
                    WHERE DoctorID = @DoctorID 
                    AND AppointmentDate = @AppointmentDate 
                    AND AppointmentTime = @AppointmentTime
                    AND Status IN ('Confirmed', 'Pending')
                `);
            
            if (conflictCheck.recordset[0].ConflictCount > 0) {
                await transaction.rollback();
                throw new Error('This time slot is no longer available. Please select another time.');
            }
            
            // Generate booking reference
            const bookingReference = this.generateBookingReference();
            
            // Insert appointment
            const insertResult = await transaction.request()
                .input('UserID', sql.Int, userId)
                .input('PolyclinicID', sql.Int, polyclinicId)
                .input('DoctorID', sql.Int, selectedDoctor.DoctorID)
                .input('AppointmentDate', sql.Date, appointmentDate)
                .input('AppointmentTime', sql.Time, appointmentTime)
                .input('Reason', sql.NVarChar(500), reason)
                .input('BookingReference', sql.NVarChar(50), bookingReference)
                .input('Status', sql.NVarChar(20), 'Confirmed')
                .query(`
                    INSERT INTO Appointments 
                    (UserID, PolyclinicID, DoctorID, AppointmentDate, AppointmentTime, Reason, BookingReference, Status)
                    OUTPUT INSERTED.AppointmentID
                    VALUES 
                    (@UserID, @PolyclinicID, @DoctorID, @AppointmentDate, @AppointmentTime, @Reason, @BookingReference, @Status)
                `);
            
            const appointmentId = insertResult.recordset[0].AppointmentID;
            
            // Get complete appointment details for response
            const appointmentDetails = await transaction.request()
                .input('AppointmentID', sql.Int, appointmentId)
                .query(`
                    SELECT 
                        a.AppointmentID,
                        a.AppointmentDate,
                        a.AppointmentTime,
                        a.Reason,
                        a.BookingReference,
                        a.Status,
                        p.PolyclinicName,
                        p.Address as PolyclinicAddress,
                        p.ContactNumber as PolyclinicContact,
                        d.DoctorName,
                        d.Specialization,
                        d.ContactNumber as DoctorContact
                    FROM Appointments a
                    JOIN Polyclinics p ON a.PolyclinicID = p.PolyclinicID
                    JOIN Doctors d ON a.DoctorID = d.DoctorID
                    WHERE a.AppointmentID = @AppointmentID
                `);
            
            await transaction.commit();
            
            const appointment = appointmentDetails.recordset[0];
            
            return {
                appointmentId: appointment.AppointmentID,
                polyclinicName: appointment.PolyclinicName,
                polyclinicAddress: appointment.PolyclinicAddress,
                polyclinicContact: appointment.PolyclinicContact,
                doctorName: appointment.DoctorName,
                doctorSpecialization: appointment.Specialization,
                doctorContact: appointment.DoctorContact,
                appointmentDate: appointment.AppointmentDate,
                appointmentTime: appointment.AppointmentTime,
                reason: appointment.Reason,
                bookingReference: appointment.BookingReference,
                status: appointment.Status
            };
            
        } catch (error) {
            await transaction.rollback();
            console.error('Error creating appointment:', error);
            throw error;
        }
    }

    // Update appointment
    static async updateAppointment(id, updateData) {
        try {
            const pool = await sql.connect(dbConfig);
            
            let updateFields = [];
            let queryParams = {};
            
            if (updateData.appointmentDate) {
                updateFields.push('AppointmentDate = @AppointmentDate');
                queryParams.AppointmentDate = updateData.appointmentDate;
            }
            
            if (updateData.appointmentTime) {
                updateFields.push('AppointmentTime = @AppointmentTime');
                queryParams.AppointmentTime = updateData.appointmentTime;
            }
            
            if (updateData.reason) {
                updateFields.push('Reason = @Reason');
                queryParams.Reason = updateData.reason;
            }
            
            if (updateData.status) {
                updateFields.push('Status = @Status');
                queryParams.Status = updateData.status;
            }
            
            if (updateFields.length === 0) {
                throw new Error('No fields to update');
            }
            
            const query = `
                UPDATE Appointments 
                SET ${updateFields.join(', ')}, ModifiedDate = GETDATE()
                WHERE AppointmentID = @Id
            `;
            
            const request = pool.request().input('Id', sql.Int, id);
            
            Object.keys(queryParams).forEach(key => {
                if (key === 'AppointmentDate') {
                    request.input(key, sql.Date, queryParams[key]);
                } else if (key === 'AppointmentTime') {
                    request.input(key, sql.Time, queryParams[key]);
                } else {
                    request.input(key, queryParams[key]);
                }
            });
            
            const result = await request.query(query);
            
            if (result.rowsAffected[0] === 0) {
                throw new Error('Appointment not found');
            }
            
            return await this.getAppointmentById(id);
            
        } catch (error) {
            console.error('Error updating appointment:', error);
            throw error;
        }
    }

    // Delete appointment
    static async deleteAppointment(id) {
        try {
            const pool = await sql.connect(dbConfig);
            
            const result = await pool.request()
                .input('Id', sql.Int, id)
                .query('DELETE FROM Appointments WHERE AppointmentID = @Id');
            
            if (result.rowsAffected[0] === 0) {
                throw new Error('Appointment not found');
            }
            
            return { success: true, message: 'Appointment deleted successfully' };
            
        } catch (error) {
            console.error('Error deleting appointment:', error);
            throw error;
        }
    }

    // Get appointment by ID
    static async getAppointmentById(id) {
        try {
            const pool = await sql.connect(dbConfig);
            
            const result = await pool.request()
                .input('Id', sql.Int, id)
                .query(`
                    SELECT 
                        a.AppointmentID,
                        a.AppointmentDate,
                        a.AppointmentTime,
                        a.Reason,
                        a.BookingReference,
                        a.Status,
                        a.CreatedDate,
                        a.ModifiedDate,
                        p.PolyclinicName,
                        p.Address as PolyclinicAddress,
                        d.DoctorName,
                        d.Specialization
                    FROM Appointments a
                    JOIN Polyclinics p ON a.PolyclinicID = p.PolyclinicID
                    JOIN Doctors d ON a.DoctorID = d.DoctorID
                    WHERE a.AppointmentID = @Id
                `);
            
            if (result.recordset.length === 0) {
                throw new Error('Appointment not found');
            }
            
            return result.recordset[0];
            
        } catch (error) {
            console.error('Error fetching appointment by ID:', error);
            throw error;
        }
    }

    // Get available doctors from database
    static async getAvailableDoctors(polyclinicId = null) {
        try {
            const pool = await sql.connect(dbConfig);
            
            let query = `
                SELECT 
                    d.DoctorID,
                    d.DoctorName,
                    d.Specialization,
                    d.ContactNumber,
                    d.Email,
                    p.PolyclinicName,
                    p.PolyclinicCode
                FROM Doctors d
                JOIN Polyclinics p ON d.PolyclinicID = p.PolyclinicID
                WHERE d.IsAvailable = 1
            `;
            
            const request = pool.request();
            
            if (polyclinicId) {
                query += ` AND d.PolyclinicID = @PolyclinicID`;
                request.input('PolyclinicID', sql.Int, polyclinicId);
            }
            
            query += ` ORDER BY d.DoctorName`;
            
            const result = await request.query(query);
            return result.recordset;
            
        } catch (error) {
            console.error('Error fetching doctors:', error);
            throw error;
        }
    }

    // Get available time slots for a specific date
    static async getAvailableTimeSlots(date, doctorId = null) {
        try {
            const pool = await sql.connect(dbConfig);
            
            let query = `
                SELECT AppointmentTime 
                FROM Appointments 
                WHERE AppointmentDate = @Date 
                AND Status IN ('Confirmed', 'Pending')
            `;
            
            const request = pool.request().input('Date', sql.Date, date);
            
            if (doctorId) {
                query += ` AND DoctorID = @DoctorID`;
                request.input('DoctorID', sql.Int, doctorId);
            }
            
            const result = await request.query(query);
            const bookedTimes = result.recordset.map(row => {
                // Convert TIME to string format
                const time = row.AppointmentTime;
                return time.toString().substring(0, 5); 
            });
            
            // Available time slots
            const allTimeSlots = [
                '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
                '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
            ];
            
            const availableSlots = allTimeSlots.filter(time => !bookedTimes.includes(time));
            
            return availableSlots;
            
        } catch (error) {
            console.error('Error fetching available time slots:', error);
            throw error;
        }
    }

    // Generate booking reference
    static generateBookingReference() {
        const date = new Date();
        const year = date.getFullYear().toString().substr(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        
        return `APT${year}${month}${day}${randomNum}`;
    }

    // Get polyclinics from database
    static async getPolyclinics() {
        try {
            const pool = await sql.connect(dbConfig);
            const result = await pool.request().query(`
                SELECT 
                    PolyclinicID,
                    PolyclinicCode,
                    PolyclinicName,
                    Address,
                    ContactNumber
                FROM Polyclinics 
                WHERE IsActive = 1 
                ORDER BY PolyclinicName
            `);
            
            return result.recordset;
        } catch (error) {
            console.error('Error fetching polyclinics:', error);
            throw error;
        }
    }
}

module.exports = AppointmentModel;