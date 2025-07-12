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