// API Configuration
const API_BASE_URL = 'http://localhost:3000/api'; 
let polyclinicsData = [];
let selectedPolyclinicData = null;
let selectedDate = null; 

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

async function initializePage() {
    const urlParams = new URLSearchParams(window.location.search);
    selectedDate = urlParams.get('date') || localStorage.getItem('selectedDate') || new Date().toISOString().split('T')[0];
    
    // Show selected date to user
    displaySelectedDate(selectedDate);
    
    await loadPolyclinics();
    initializeTimeSlots();
    initializeForm();
}

function displaySelectedDate(date) {
    const formattedDate = new Date(date).toLocaleDateString('en-SG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Update the header to show selected date
    const headerElement = document.querySelector('.header p');
    if (headerElement) {
        headerElement.textContent = `Please provide the following information to schedule your visit on ${formattedDate}`;
    }
    
    // Update the back link to be more specific
    const backLink = document.querySelector('.back-link');
    if (backLink && localStorage.getItem('fromCalendar') === 'true') {
        backLink.textContent = 'Back to Calendar';
    }
}

// Load polyclinics from database
async function loadPolyclinics() {
    const loadingMessage = document.getElementById('loadingMessage');
    const polyclinicSelect = document.getElementById('polyclinic');
    
    try {
        loadingMessage.style.display = 'block';
        polyclinicSelect.disabled = true;
        
        const response = await fetch(`${API_BASE_URL}/polyclinics`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load polyclinics');
        }
        
        polyclinicsData = await response.json();
        populatePolyclinicSelect();
        
    } catch (error) {
        console.error('Error loading polyclinics:', error);
        showError('Failed to load polyclinics. Please refresh the page and try again.');
    } finally {
        loadingMessage.style.display = 'none';
        polyclinicSelect.disabled = false;
    }
}

function populatePolyclinicSelect() {
    const polyclinicSelect = document.getElementById('polyclinic');
    polyclinicSelect.innerHTML = '<option value="">Please select a polyclinic</option>';
    
    polyclinicsData.forEach(polyclinic => {
        const option = document.createElement('option');
        option.value = polyclinic.PolyclinicID;
        option.textContent = polyclinic.PolyclinicName;
        option.dataset.code = polyclinic.PolyclinicCode;
        option.dataset.address = polyclinic.Address;
        polyclinicSelect.appendChild(option);
    });
    
    // Add event listener for polyclinic selection
    polyclinicSelect.addEventListener('change', handlePolyclinicChange);
}

function handlePolyclinicChange(event) {
    const selectedOption = event.target.selectedOptions[0];
    if (selectedOption && selectedOption.value) {
        selectedPolyclinicData = {
            id: parseInt(selectedOption.value),
            name: selectedOption.textContent,
            code: selectedOption.dataset.code,
            address: selectedOption.dataset.address
        };
    } else {
        selectedPolyclinicData = null;
    }
}

function initializeTimeSlots() {
    const timeSlots = document.querySelectorAll('.time-slot');
    const selectedTimeInput = document.getElementById('selectedTime');
    
    timeSlots.forEach(slot => {
        slot.addEventListener('click', function() {
            // Remove selected class from all slots
            timeSlots.forEach(s => s.classList.remove('selected'));
            // Add selected class to clicked slot
            this.classList.add('selected');
            // Set the hidden input value
            selectedTimeInput.value = this.dataset.time;
        });
    });
}

function initializeForm() {
    const form = document.getElementById('appointmentForm');
    form.addEventListener('submit', handleFormSubmit);
    
    // Add input validation
    const inputs = form.querySelectorAll('select, textarea');
    inputs.forEach(input => {
        input.addEventListener('change', validateInput);
    });
}

function validateInput(event) {
    const input = event.target;
    if (input.value.trim()) {
        input.style.borderColor = '#48bb78';
    } else {
        input.style.borderColor = '#e2e8f0';
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const polyclinicId = document.getElementById('polyclinic').value;
    const appointmentTime = document.getElementById('selectedTime').value;
    const reason = document.getElementById('reason').value;
    
    const errorMessage = document.getElementById('errorMessage');
    
    // Hide previous error message
    errorMessage.style.display = 'none';
    
    // Validate form
    if (!polyclinicId || !appointmentTime || !reason.trim() || !selectedDate) {
        showError('Please fill in all required fields before booking your appointment.');
        return;
    }
    
    if (!selectedPolyclinicData) {
        showError('Please select a valid polyclinic.');
        return;
    }
    
    // Prepare appointment data
    const appointmentData = {
        polyclinicId: parseInt(polyclinicId),
        appointmentDate: selectedDate,
        appointmentTime: appointmentTime,
        reason: reason.trim()
    };
    
    // Submit appointment
    await saveAppointmentToDatabase(appointmentData);
}

async function saveAppointmentToDatabase(appointmentData) {
    const submitBtn = document.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    
    try {
        // Show loading state
        submitBtn.textContent = 'Booking...';
        submitBtn.disabled = true;
        
        const response = await fetch(`${API_BASE_URL}/appointments/book`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appointmentData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Failed to book appointment');
        }
        
        if (result.success) {
            // Show confirmation popup with returned data
            showConfirmationPopup(result.data);
            
            // Clear saved form data
            clearSavedFormData();
            
            // Reset form
            document.getElementById('appointmentForm').reset();
            document.querySelectorAll('.time-slot').forEach(slot => {
                slot.classList.remove('selected');
            });
            selectedPolyclinicData = null;
        } else {
            throw new Error(result.message || 'Failed to book appointment');
        }
        
    } catch (error) {
        console.error('Error booking appointment:', error);
        showError(error.message || 'An error occurred while booking your appointment. Please try again.');
    } finally {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function showConfirmationPopup(appointmentData) {
    // Populate popup with booking details
    document.getElementById('confirmedLocation').textContent = appointmentData.polyclinicName;
    document.getElementById('confirmedDate').textContent = formatDate(appointmentData.appointmentDate);
    document.getElementById('confirmedTime').textContent = formatTime(appointmentData.appointmentTime);
    document.getElementById('confirmedReason').textContent = appointmentData.reason;
    document.getElementById('assignedDoctor').textContent = appointmentData.doctorName;
    document.getElementById('bookingReference').textContent = appointmentData.bookingReference;
    
    // Show popup
    const popup = document.getElementById('confirmationPopup');
    popup.style.display = 'block';
    
    // Add event listener for clicking outside popup to close
    popup.addEventListener('click', function(e) {
        if (e.target === this) {
            closePopup();
        }
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    return date.toLocaleDateString('en-SG', options);
}

function formatTime(time) {
    // Convert 24-hour format to 12-hour format
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

function closePopup() {
    document.getElementById('confirmationPopup').style.display = 'none';
}

function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    errorMessage.scrollIntoView({ behavior: 'smooth' });
    
    // Auto-hide error message
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

function goBack() {
    // Clear any stored appointment data
    localStorage.removeItem('selectedDate');
    localStorage.removeItem('fromCalendar');
    
    // Go back to calendar
    if (document.referrer && document.referrer.includes('Calendar.html')) {
        // If we came from calendar, go back using history
        window.history.back();
    } else {
        // Otherwise, navigate directly to calendar
        window.location.href = 'Calendar.html';
    }
}

// Utility function to get user token
function getUserToken() {
    // Get token from localStorage, sessionStorage, or cookie
    return localStorage.getItem('userToken') || 
           sessionStorage.getItem('userToken') || 
           getCookie('userToken');
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// Handle escape key to close popup
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closePopup();
    }
});

// Handle page refresh warning if form has data
window.addEventListener('beforeunload', function(e) {
    const form = document.getElementById('appointmentForm');
    const formData = new FormData(form);
    let hasData = false;
    
    for (let [key, value] of formData.entries()) {
        if (value && value.trim()) {
            hasData = true;
            break;
        }
    }
    
    if (hasData) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// Auto-save form data to prevent loss
function autoSaveFormData() {
    const formData = {
        polyclinic: document.getElementById('polyclinic').value,
        selectedTime: document.getElementById('selectedTime').value,
        reason: document.getElementById('reason').value
    };
    
    localStorage.setItem('appointmentFormData', JSON.stringify(formData));
}

// Restore form data on page load
function restoreFormData() {
    const savedData = localStorage.getItem('appointmentFormData');
    if (savedData) {
        try {
            const formData = JSON.parse(savedData);
            
            if (formData.polyclinic) {
                document.getElementById('polyclinic').value = formData.polyclinic;
                handlePolyclinicChange({ target: document.getElementById('polyclinic') });
            }
            
            if (formData.selectedTime) {
                document.getElementById('selectedTime').value = formData.selectedTime;
                const timeSlot = document.querySelector(`[data-time="${formData.selectedTime}"]`);
                if (timeSlot) {
                    timeSlot.classList.add('selected');
                }
            }
            
            if (formData.reason) {
                document.getElementById('reason').value = formData.reason;
            }
            
        } catch (error) {
            console.error('Error restoring form data:', error);
        }
    }
}

// Clear saved form data when appointment is successfully booked
function clearSavedFormData() {
    localStorage.removeItem('appointmentFormData');
}

// Add auto-save listeners
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(restoreFormData, 500); // Delay to ensure polyclinics are loaded
    
    const form = document.getElementById('appointmentForm');
    if (form) {
        form.addEventListener('input', autoSaveFormData);
        form.addEventListener('change', autoSaveFormData);
    }
});
