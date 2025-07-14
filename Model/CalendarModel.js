let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let selectedDate = null;
let showPrayerTimes = false;
let currentLocation = 'Singapore';
let culturalEvents = {};
let prayerTimes = {};
let appointments = {};
const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export async function getAppointments(date) {
    const res = await fetch(`/api/appointments?date=${date}`);
    return res.json();
}

export async function createAppointment(data) {
    const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res.json();
}

export async function updateAppointment(id, data) {
    const res = await fetch(`/api/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res.json();
}

export async function deleteAppointment(id) {
    const res = await fetch(`/api/appointments/${id}`, {
        method: 'DELETE'
    });
    return res.json();
}