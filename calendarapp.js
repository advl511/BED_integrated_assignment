const API_BASE_URL = 'http://localhost:3000/api';

// Add user session management
let currentUser = null;

// Load user profile data
async function loadUserProfile() {
    try {
        // Get user from session/localStorage
        const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
        if (!userId) {
            window.location.href = 'signin.html'; // Redirect to login if no user
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/user/profile/${userId}`);
        currentUser = await response.json();
        
        // Apply user settings to calendar
        applyUserSettings();
        
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

// Apply user settings from profile
function applyUserSettings() {
    if (currentUser) {
        // Apply font size preference
        document.body.className = currentUser.fontSize || 'font-medium';
        
        // Apply prayer times setting
        const prayerToggle = document.getElementById('prayerToggle');
        if (prayerToggle && currentUser.showPrayerTimes) {
            prayerToggle.classList.add('active');
        }
        
        // Set location
        const locationSelect = document.getElementById('locationSelect');
        if (locationSelect && currentUser.location) {
            locationSelect.value = currentUser.location;
        }
    }
}

// Update appointment booking to include user info
async function bookAppointmentWithProfile() {
    if (!currentUser) {
        alert('Please log in to book an appointment');
        return;
    }
    
    // Pass user data to appointment page
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    localStorage.setItem('selectedDate', getSelectedDate());
    localStorage.setItem('fromCalendar', 'true');
    
    window.location.href = `Appointment.html?userId=${currentUser.id}&date=${getSelectedDate()}`;
}

// Initialize with user profile
document.addEventListener('DOMContentLoaded', async function() {
    await loadUserProfile();
    
    // Add click handlers to calendar days
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                const calendarDays = document.querySelectorAll('.calendar-day');
                calendarDays.forEach(day => {
                    if (!day.hasAttribute('data-click-handler')) {
                        day.setAttribute('data-click-handler', 'true');
                        day.addEventListener('click', async function() {
                            // Remove selected class from all days
                            calendarDays.forEach(d => d.classList.remove('selected'));
                            // Add selected class to clicked day
                            this.classList.add('selected');
                            
                            if (this.dataset.date) {
                                await displayAppointmentsOnCalendar(this.dataset.date);
                            }
                        });
                    }
                });
            }
        });
    });
    
    const calendarGrid = document.getElementById('calendarGrid');
    if (calendarGrid) {
        observer.observe(calendarGrid, { childList: true, subtree: true });
    }
});

async function loadUserSettings(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/settings/${userId}`);
        const settings = await response.json();
        return settings;
    } catch (error) {
        console.error('Error loading settings:', error);
        return null;
    }
}

async function saveUserSettings(userId, settings) {
    try {
        const response = await fetch(`${API_BASE_URL}/settings/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(settings)
        });
        return await response.json();
    } catch (error) {
        console.error('Error saving settings:', error);
        return null;
    }
}

async function loadAppointments(date) {
    try {
        const response = await fetch(`${API_BASE_URL}/appointments?date=${date}`);
        const appointments = await response.json();
        return appointments;
    } catch (error) {
        console.error('Error loading appointments:', error);
        return [];
    }
}

// Add the missing getSelectedDate function
function getSelectedDate() {
    const selectedDateElement = document.querySelector('.calendar-day.selected');
    if (selectedDateElement && selectedDateElement.dataset.date) {
        return selectedDateElement.dataset.date;
    }
    // Fallback to today's date
    return new Date().toISOString().split('T')[0];
}