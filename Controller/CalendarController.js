let showPrayerTimes = false;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// Close button functionality
document.getElementById('closeModal').addEventListener('click', function() {
    document.getElementById('dayModal').style.display = 'none';
});

// Prayer times toggle functionality
document.getElementById('prayerToggle').addEventListener('click', function() {
    showPrayerTimes = !showPrayerTimes;
    this.classList.toggle('active', showPrayerTimes);
    updatePrayerTimesDisplay();
});

function updatePrayerTimesDisplay() {
    const prayerSection = document.getElementById('prayerTimesSection');
    prayerSection.style.display = showPrayerTimes ? 'block' : 'none';
    
    if (showPrayerTimes) {
        const location = document.getElementById('locationSelect').value;
        fetchPrayerTimes(location);
    }
}

async function fetchPrayerTimes(location) {
    const prayerTimes = document.getElementById('prayerTimes');
    try {
        const date = new Date();
        const response = await fetch(`https://api.aladhan.com/v1/timingsByCity/${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}?city=${location}&country=SG`);
        const data = await response.json();
        const timings = data.data.timings;
        
        prayerTimes.innerHTML = `
            <div class="prayer-time">Fajr: ${timings.Fajr}</div>
            <div class="prayer-time">Dhuhr: ${timings.Dhuhr}</div>
            <div class="prayer-time">Asr: ${timings.Asr}</div>
            <div class="prayer-time">Maghrib: ${timings.Maghrib}</div>
            <div class="prayer-time">Isha: ${timings.Isha}</div>
        `;
    } catch (error) {
        prayerTimes.innerHTML = '<div class="error">Unable to load prayer times</div>';
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
        dayElement.addEventListener('click', () => openDayModal(dateStr, holiday));
        calendarGrid.appendChild(dayElement);
    }
}

function openDayModal(dateStr, holiday) {
    const modal = document.getElementById('dayModal');
    const modalDate = document.getElementById('modalDate');
    const eventsList = document.getElementById('eventsList');
    
    modalDate.textContent = new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Display holiday if exists
    eventsList.innerHTML = holiday ? 
        `<div class="holiday-event">${holiday.name}</div>` : 
        '<div class="no-events">No cultural events today</div>';

    modal.style.display = 'block';
}

// Initialize calendar
document.addEventListener('DOMContentLoaded', () => {
    renderCalendar();
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