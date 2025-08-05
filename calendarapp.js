const API_BASE_URL = 'http://localhost:3000/api';

// Add user session management
let currentUser = null;

// Check if user is logged in
async function checkUserAuthentication() {
    const token = localStorage.getItem('auth_token');
    const userId = localStorage.getItem('user_id');
    const username = localStorage.getItem('username');
    const email = localStorage.getItem('email');
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    
    // Check multiple indicators of login status
    if ((token && userId) || (isLoggedIn === 'true' && userId)) {
        // User appears to be logged in, create user object from localStorage
        const userData = {
            user_id: userId,
            username: username,
            email: email
        };
        
        console.log('User authenticated from localStorage:', userData);
        return { isAuthenticated: true, user: userData };
    } else {
        console.log('User not authenticated - missing login data');
        return { isAuthenticated: false, user: null };
    }
}

// Clear authentication data
function clearAuthData() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userData');
}

// Load user profile data
async function loadUserProfile() {
    try {
        // Check if user is authenticated first
        const authStatus = await checkUserAuthentication();
        if (!authStatus.isAuthenticated) {
            console.log('User not authenticated, but allowing calendar access');
            return; // Don't redirect, just return
        }
        
        // User is authenticated, load their profile
        currentUser = authStatus.user;
        
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

// Handle appointment booking with authentication check
async function handleAppointmentBooking() {
    const authStatus = await checkUserAuthentication();
    
    if (!authStatus.isAuthenticated) {
        // Show login prompt instead of redirecting
        showLoginPrompt();
        return;
    }
    
    // User is authenticated, redirect to appointment.html
    const selectedDate = getSelectedDate();
    localStorage.setItem('selectedDate', selectedDate);
    localStorage.setItem('fromCalendar', 'true');
    window.location.href = `Appointment.html?userId=${authStatus.user.user_id}&date=${selectedDate}`;
}

// Show a login prompt modal instead of redirecting
function showLoginPrompt() {
    // Create login prompt modal
    const loginModal = document.createElement('div');
    loginModal.className = 'modal';
    loginModal.id = 'loginPromptModal';
    loginModal.innerHTML = `
        <div class="modal-content" style="max-width: 400px; text-align: center;">
            <h3>Login Required</h3>
            <p>You need to log in to book appointments.</p>
            <div style="margin-top: 20px;">
                <button onclick="redirectToLogin()" class="appointment-btn" style="margin-right: 10px;">
                    Go to Login
                </button>
                <button onclick="closeLoginPrompt()" class="appointment-btn" style="background-color: #6c757d;">
                    Cancel
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(loginModal);
    loginModal.style.display = 'block';
}

// Redirect to login page
function redirectToLogin() {
    // Store the current page URL to return after login
    localStorage.setItem('returnToPage', window.location.href);
    window.location.href = 'signin.html';
}

// Close login prompt
function closeLoginPrompt() {
    const modal = document.getElementById('loginPromptModal');
    if (modal) {
        modal.remove();
    }
}

// Update calendar UI based on authentication status
function updateCalendarUI(authStatus) {
    const appointmentBtn = document.querySelector('.appointment-btn');
    
    if (authStatus.isAuthenticated) {
        // User is logged in - enable full functionality
        if (appointmentBtn) {
            appointmentBtn.textContent = 'Book Medical Appointment';
            appointmentBtn.disabled = false;
        }
        
    } else {
        // User is not logged in - show login prompt
        if (appointmentBtn) {
            appointmentBtn.textContent = 'Login to Book Appointment';
            appointmentBtn.disabled = false;
        }
    }
}

// Initialize with user profile
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication status
    const authStatus = await checkUserAuthentication();
    
    // Update UI based on authentication
    updateCalendarUI(authStatus);
    
    // Set up modal close functionality for appointment modal
    const closeAppointmentModal = document.getElementById('closeAppointmentModal');
    if (closeAppointmentModal) {
        closeAppointmentModal.addEventListener('click', function() {
            closeAppointmentModalFunction();
        });
    }
    
    // Load user profile if authenticated (but don't block calendar access)
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
        console.log('Appointments loaded:', appointments);
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

async function displayAppointmentsOnCalendar(date) {
    // Show loading state
    let appointmentsList = document.getElementById('appointmentsList');
    if (!appointmentsList) {
        appointmentsList = document.createElement('div');
        appointmentsList.id = 'appointmentsList';
        appointmentsList.style.marginTop = '20px';
    }

    appointmentsList.innerHTML = `<div>Loading appointments for ${date}...</div>`;

    // Fetch appointments
    const appointments = await loadAppointments(date);

    // Display appointments
    if (!appointments || appointments.length === 0) {
        appointmentsList.innerHTML = `<div>No appointments for ${date}.</div>`;
    } else {
        // Build HTML for appointments
        const html = `
            <h3>Appointments for ${date}</h3>
            <ul style="list-style: none; padding: 0;">
                ${appointments.map(app => `
                    <li style="margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                        <strong>Time:</strong> ${app.AppointmentTime || app.appointmentTime}<br>
                        <strong>Polyclinic:</strong> ${app.PolyclinicName || app.polyclinicName || ''}<br>
                        <strong>Doctor:</strong> ${app.DoctorName || app.doctorName || ''}<br>
                        <strong>Reason:</strong> ${app.Reason || app.reason}
                    </li>
                `).join('')}
            </ul>
        `;
        appointmentsList.innerHTML = html;
    }

    // Always append inside the calendar grid/container
    const calendarGrid = document.getElementById('calendarGrid');
    if (calendarGrid) {
        // Remove any existing appointmentsList from DOM before appending
        if (appointmentsList.parentNode && appointmentsList.parentNode !== calendarGrid) {
            appointmentsList.parentNode.removeChild(appointmentsList);
        }
        calendarGrid.appendChild(appointmentsList);
    } else {
        // fallback
        document.body.appendChild(appointmentsList);
    }
}
