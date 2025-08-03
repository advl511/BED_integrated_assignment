let showPrayerTimes = false;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let currentLocation = 'Singapore';

// Font size functionality
document.addEventListener('DOMContentLoaded', () => {
    // Initialize font size
    const fontSizeSelect = document.getElementById('fontSizeSelect');
    const savedFontSize = localStorage.getItem('calendarFontSize') || 'font-medium';
    
    // Apply saved font size
    document.body.className = savedFontSize;
    fontSizeSelect.value = savedFontSize;
    
    // Add font size change listener
    fontSizeSelect.addEventListener('change', function() {
        const selectedFontSize = this.value;
        
        // Remove all font size classes
        document.body.classList.remove('font-small', 'font-medium', 'font-large', 'font-extra-large');
        
        // Add selected font size class
        document.body.classList.add(selectedFontSize);
        
        // Save preference
        localStorage.setItem('calendarFontSize', selectedFontSize);
    });
    
    // Initialize location
    const locationSelect = document.getElementById('locationSelect');
    const savedLocation = localStorage.getItem('calendarLocation') || 'Singapore';
    locationSelect.value = savedLocation;
    currentLocation = savedLocation;
    
    // Add location change listener
    locationSelect.addEventListener('change', function() {
        currentLocation = this.value;
        localStorage.setItem('calendarLocation', currentLocation);
        
        // Update prayer times 
        if (showPrayerTimes) {
            updatePrayerTimesDisplay();
        }
    });
    
    renderCalendar();
});

// Close button functionality
document.getElementById('closeModal').addEventListener('click', function() {
    document.getElementById('dayModal').style.display = 'none';
});

// Prayer times toggle functionality
document.getElementById('prayerToggle').addEventListener('click', function() {
    showPrayerTimes = !showPrayerTimes;
    this.classList.toggle('active', showPrayerTimes);
    
    // Save prayer times preference
    localStorage.setItem('showPrayerTimes', showPrayerTimes);
    
    updatePrayerTimesDisplay();
});

function updatePrayerTimesDisplay() {
    const prayerSection = document.getElementById('prayerTimesSection');
    prayerSection.style.display = showPrayerTimes ? 'block' : 'none';
    
    if (showPrayerTimes && document.getElementById('dayModal').style.display === 'block') {
        const modalDate = document.getElementById('modalDate').textContent;
        const selectedDate = new Date(modalDate);
        fetchPrayerTimesForDate(currentLocation, selectedDate);
    }
}

async function fetchPrayerTimesForDate(location, date) {
    const prayerTimes = document.getElementById('prayerTimes');
    try {
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        
        let country = 'SG'; 
        if (location === 'Kuala Lumpur') country = 'MY';
        else if (location === 'Jakarta') country = 'ID';
        else if (location === 'Bangkok') country = 'TH';
        else if (location === 'Manila') country = 'PH';
        
        const response = await fetch(`https://api.aladhan.com/v1/timingsByCity/${day}-${month}-${year}?city=${location}&country=${country}`);
        const data = await response.json();
        
        if (data.code === 200) {
            const timings = data.data.timings;
            
            prayerTimes.innerHTML = `
                <div class="prayer-time"><strong>Fajr:</strong> ${timings.Fajr}</div>
                <div class="prayer-time"><strong>Dhuhr:</strong> ${timings.Dhuhr}</div>
                <div class="prayer-time"><strong>Asr:</strong> ${timings.Asr}</div>
                <div class="prayer-time"><strong>Maghrib:</strong> ${timings.Maghrib}</div>
                <div class="prayer-time"><strong>Isha:</strong> ${timings.Isha}</div>
            `;
        } else {
            throw new Error('API returned error');
        }
    } catch (error) {
        console.error('Error fetching prayer times:', error);
        prayerTimes.innerHTML = '<div class="error">Unable to load prayer times for this date</div>';
    }
}

// Holidays functionality
async function fetchHolidays() {
    try {
        const response = await fetch('https://date.nager.at/api/v3/publicholidays/2025/SG');
        const holidays = await response.json();
        return holidays;
    } catch (error) {
        console.error('Error fetching holidays:', error);
        return [];
    }
}

async function renderCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    const monthDisplay = document.getElementById('currentMonth');
    const holidays = await fetchHolidays();
    
    // Clear previous calendar days (keep headers)
    const headers = Array.from(calendarGrid.getElementsByClassName('calendar-header'));
    calendarGrid.innerHTML = '';
    headers.forEach(header => calendarGrid.appendChild(header));

    // Set current month display
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    monthDisplay.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    // Get first day of month and total days
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Add blank spaces for days before first of month
    for (let i = 0; i < firstDay; i++) {
        const blankDay = document.createElement('div');
        blankDay.className = 'calendar-day empty';
        calendarGrid.appendChild(blankDay);
    }

    // Add calendar days
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // Check for holidays
        const holiday = holidays.find(h => h.date === dateStr);
        if (holiday) {
            dayElement.classList.add('holiday');
            dayElement.innerHTML = `${day}<div class="holiday-name">${holiday.name}</div>`;
        } else {
            dayElement.textContent = day;
        }

        dayElement.dataset.date = dateStr;
        dayElement.addEventListener('click', (e) => {
            selectDateForAppointment(dayElement, day);
            // Then open the day modal
            openDayModal(dateStr, holiday);
        });
        calendarGrid.appendChild(dayElement);
    }
}

function openDayModal(dateStr, holiday) {
    const modal = document.getElementById('dayModal');
    const modalDate = document.getElementById('modalDate');
    const eventsList = document.getElementById('eventsList');
    
    const selectedDate = new Date(dateStr);
    modalDate.textContent = selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Display holiday if exists
    eventsList.innerHTML = holiday ? 
        `<div class="holiday-event">${holiday.name}</div>` : 
        '<div class="no-events">No cultural events today</div>';

    // Update prayer times for the specific selected date
    if (showPrayerTimes) {
        fetchPrayerTimesForDate(currentLocation, selectedDate);
    }

    // Update the appointment button to use the selected date
    const appointmentBtn = document.querySelector('.appointment-btn');
    if (appointmentBtn) {
        // Store the selected date for the appointment booking
        appointmentBtn.dataset.selectedDate = dateStr;
        
        // Update button text to be more specific
        const dateFormatted = selectedDate.toLocaleDateString('en-SG', {
            month: 'short',
            day: 'numeric'
        });
        appointmentBtn.innerHTML = `Book Medical Appointment for ${dateFormatted}`;
    }

    modal.style.display = 'block';
}

// Initialize calendar and add month navigation listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize saved settings
    const savedPrayerToggle = localStorage.getItem('showPrayerTimes');
    if (savedPrayerToggle === 'true') {
        showPrayerTimes = true;
        document.getElementById('prayerToggle').classList.add('active');
    }
    
    // Add month navigation listeners
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });
});

// Navigation function to book appointment
function bookAppointment() {
    let selectedDate = null;
    const appointmentBtn = document.querySelector('.appointment-btn');
    if (appointmentBtn && appointmentBtn.dataset.selectedDate) {
        selectedDate = appointmentBtn.dataset.selectedDate;
    } else {
        const selectedDateElement = document.querySelector('.calendar-day.selected');
        if (selectedDateElement) {
            const day = selectedDateElement.textContent.trim();
            const month = (currentMonth + 1).toString().padStart(2, '0');
            const year = currentYear;
            selectedDate = `${year}-${month}-${day.padStart(2, '0')}`;
        } else {
            const today = new Date();
            const month = (today.getMonth() + 1).toString().padStart(2, '0');
            const day = today.getDate().toString().padStart(2, '0');
            selectedDate = `${today.getFullYear()}-${month}-${day}`;
        }
    }
    
    // Store selected date in localStorage for the appointment page
    localStorage.setItem('selectedDate', selectedDate);
    localStorage.setItem('fromCalendar', 'true');
    
    const modal = document.getElementById('dayModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    console.log('Navigating to appointment page with date:', selectedDate);
    
    // Navigate to appointment page
    window.location.href = 'Appointment.html?date=' + selectedDate;
}

// Function to handle day selection for appointment booking
function selectDateForAppointment(dayElement, day) {
    // Remove previous selection
    document.querySelectorAll('.calendar-day').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Add selection to clicked day
    dayElement.classList.add('selected');
    
    // Update the modal or any UI to show selected date
    const month = (currentMonth + 1).toString().padStart(2, '0');
    const year = currentYear;
    const selectedDate = `${year}-${month}-${day.toString().padStart(2, '0')}`;
    
    console.log('Selected date for appointment:', selectedDate);
}

// Function to navigate back to calendar from external pages
function returnToCalendar() {
    window.location.href = 'Calendar.html';
}