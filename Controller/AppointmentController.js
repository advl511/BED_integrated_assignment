const AppointmentModel = require('../Model/AppointmentModel');

class AppointmentController {
    
    // GET
    static async getAppointments(req, res) {
        try {
            const { date, page, limit, status } = req.query;
            
            let appointments;
            
            if (date) {
                // Get appointments for specific date
                appointments = await AppointmentModel.getAppointmentsByDate(date);
            } else {
                appointments = await AppointmentModel.getUserAppointments(null, page, limit, status);
            }
            
            res.json({
                success: true,
                data: appointments,
                count: appointments.length
            });
            
        } catch (error) {
            console.error('Error in getAppointments:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch appointments',
                error: error.message
            });
        }
    }

    // GET /api/appointments/:id 
    static async getAppointmentById(req, res) {
        try {
            const { id } = req.params;
            
            const appointment = await AppointmentModel.getAppointmentById(id);
            
            res.json({
                success: true,
                data: appointment
            });
            
        } catch (error) {
            console.error('Error in getAppointmentById:', error);
            
            if (error.message === 'Appointment not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Appointment not found'
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Failed to fetch appointment',
                error: error.message
            });
        }
    }

    // POST /api/appointments
    static async createAppointment(req, res) {
        try {
            const { polyclinicId, appointmentDate, appointmentTime, reason } = req.body;

            const appointmentData = {
                polyclinicId: parseInt(polyclinicId),
                appointmentDate,
                appointmentTime,
                reason,
                userId: 1 
            };
            
            const newAppointment = await AppointmentModel.createAppointment(appointmentData);
            
            res.status(201).json({
                success: true,
                message: 'Appointment booked successfully',
                data: newAppointment
            });
            
        } catch (error) {
            console.error('Error in createAppointment:', error);
            
            if (error.message.includes('time slot is no longer available')) {
                return res.status(409).json({
                    success: false,
                    message: error.message
                });
            }
            
            if (error.message.includes('No available doctors')) {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Failed to book appointment. Please try again.',
                error: error.message
            });
        }
    }

    // PUT /api/appointments/:id 
    static async updateAppointment(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            
            const updatedAppointment = await AppointmentModel.updateAppointment(id, updateData);
            
            res.json({
                success: true,
                message: 'Appointment updated successfully',
                data: updatedAppointment
            });
            
        } catch (error) {
            console.error('Error in updateAppointment:', error);
            
            if (error.message === 'Appointment not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Appointment not found'
                });
            }
            
            if (error.message === 'No fields to update') {
                return res.status(400).json({
                    success: false,
                    message: 'No valid fields provided for update'
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Failed to update appointment',
                error: error.message
            });
        }
    }

    // DELETE /api/appointments/:id 
    static async deleteAppointment(req, res) {
        try {
            const { id } = req.params;
            
            const result = await AppointmentModel.deleteAppointment(id);
            
            res.json({
                success: true,
                message: 'Appointment cancelled successfully'
            });
            
        } catch (error) {
            console.error('Error in deleteAppointment:', error);
            
            if (error.message === 'Appointment not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Appointment not found'
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Failed to cancel appointment',
                error: error.message
            });
        }
    }

    // GET /api/polyclinics 
    static async getPolyclinics(req, res) {
        try {
            const polyclinics = await AppointmentModel.getPolyclinics();
            res.json(polyclinics);
            
        } catch (error) {
            console.error('Error in getPolyclinics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch polyclinics',
                error: error.message
            });
        }
    }

    // GET /api/polyclinics/:id/doctors 
    static async getPolyclinicDoctors(req, res) {
        try {
            const { id } = req.params;
            
            const doctors = await AppointmentModel.getAvailableDoctors(parseInt(id));
            
            res.json(doctors);
            
        } catch (error) {
            console.error('Error in getPolyclinicDoctors:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch doctors',
                error: error.message
            });
        }
    }

    // GET /api/appointments/available-slots 
    static async getAvailableSlots(req, res) {
        try {
            const { date, doctorId } = req.query;
            
            if (!date) {
                return res.status(400).json({
                    success: false,
                    message: 'Date parameter is required'
                });
            }
            
            const availableSlots = await AppointmentModel.getAvailableTimeSlots(date, doctorId);
            
            res.json({
                success: true,
                data: {
                    date: date,
                    doctorId: doctorId || 'Any doctor',
                    availableSlots: availableSlots
                }
            });
            
        } catch (error) {
            console.error('Error in getAvailableSlots:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch available slots',
                error: error.message
            });
        }
    }

    // GET /api/appointments/stats 
    static async getAppointmentStats(req, res) {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            const todayAppointments = await AppointmentModel.getAppointmentsByDate(today);
            
            const stats = {
                todayAppointments: todayAppointments.length,
                confirmedToday: todayAppointments.filter(apt => apt.Status === 'Confirmed').length,
                pendingToday: todayAppointments.filter(apt => apt.Status === 'Pending').length,
                cancelledToday: todayAppointments.filter(apt => apt.Status === 'Cancelled').length
            };
            
            res.json({
                success: true,
                data: stats
            });
            
        } catch (error) {
            console.error('Error in getAppointmentStats:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch appointment statistics',
                error: error.message
            });
        }
    }
}

module.exports = AppointmentController;
