function updatePrayerTimesDisplay() {
    renderCalendar();
}

function setupEventListeners() {
    document.getElementById('fontSizeSelect').addEventListener('change', function() {
        document.body.className = this.value;
    });

    document.getElementById('prayerToggle').addEventListener('click', function() {
    showPrayerTimes = !showPrayerTimes;
    this.classList.toggle('active', showPrayerTimes);
    updatePrayerTimesDisplay();
});

    document.getElementById('locationSelect').addEventListener('change', function() {
        currentLocation = this.value;
        loadCulturalEvents();
    });

    document.getElementById('prevMonth').addEventListener('click', function() {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
        loadCulturalEvents();
    });

    document.getElementById('nextMonth').addEventListener('click', function() {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
        loadCulturalEvents();
    });

    document.getElementById('closeModal').addEventListener('click', function() {
        document.getElementById('dayModal').style.display = 'none';
    });

    document.getElementById('dayModal').addEventListener('click', function(e) {
        if (e.target === this) {
            this.style.display = 'none';
        }
    });
}

function renderCalendar() {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const calendarGrid = document.getElementById('calendarGrid');
    const currentMonthElement = document.getElementById('currentMonth');
    currentMonthElement.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    while (calendarGrid.children.length > 7) {
        calendarGrid.removeChild(calendarGrid.lastChild);
    }

    for (let i = 0; i < 42; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.innerHTML = `
            <div class="day-number">${date.getDate()}</div>
            <div class="event-list"></div>
        `;

        if (date.getMonth() !== currentMonth) {
            dayElement.classList.add('other-month');
        }
        if (date.toDateString() === new Date().toDateString()) {
            dayElement.classList.add('today');
        }

        dayElement.addEventListener('click', function() {
            selectedDate = new Date(date);
            showDayDetails(date);
        });

        calendarGrid.appendChild(dayElement);
        addEventsToDay(dayElement, date);
    }
}

function addEventsToDay(dayElement, date) {
    const dateStr = date.toISOString().split('T')[0];
    const eventList = dayElement.querySelector('.event-list');

    if (culturalEvents[dateStr]) {
        culturalEvents[dateStr].forEach(event => {
            const eventItem = document.createElement('div');
            eventItem.className = 'event-item cultural';
            eventItem.textContent = event.name.substring(0, 20) + (event.name.length > 20 ? '...' : '');
            eventList.appendChild(eventItem);
        });
    }

    if (showPrayerTimes) {
        const prayerItem = document.createElement('div');
        prayerItem.className = 'event-item prayer';
        prayerItem.textContent = 'Prayer Times';
        eventList.appendChild(prayerItem);
    }

    if (appointments[dateStr]) {
        appointments[dateStr].forEach(appointment => {
            const appointmentItem = document.createElement('div');
            appointmentItem.className = 'event-item appointment';
            appointmentItem.textContent = appointment.type;
            eventList.appendChild(appointmentItem);
        });
    }
}

function showDayDetails(date) {
    const modal = document.getElementById('dayModal');
    const modalDate = document.getElementById('modalDate');
    const eventsList = document.getElementById('eventsList');
    const prayerTimesSection = document.getElementById('prayerTimesSection');
    const appointmentsList = document.getElementById('appointmentsList');

    modalDate.textContent = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const dateStr = date.toISOString().split('T')[0];
    eventsList.innerHTML = '';
    if (culturalEvents[dateStr]) {
        culturalEvents[dateStr].forEach(event => {
            const eventDiv = document.createElement('div');
            eventDiv.innerHTML = `
                <h4>${event.name}</h4>
                <p>${event.description || 'Cultural celebration'}</p>
            `;
            eventsList.appendChild(eventDiv);
        });
    } else {
        eventsList.innerHTML = '<p>No cultural events for this day</p>';
    }

    if (showPrayerTimes) {
        prayerTimesSection.style.display = 'block';
        loadPrayerTimes(date);
    } else {
        prayerTimesSection.style.display = 'none';
    }

    appointmentsList.innerHTML = '';
    if (appointments[dateStr]) {
        appointments[dateStr].forEach(appointment => {
            const appointmentDiv = document.createElement('div');
            appointmentDiv.innerHTML = `
                <h4>${appointment.type}</h4>
                <p>Time: ${appointment.time}</p>
                <p>Doctor: ${appointment.doctor}</p>
            `;
            appointmentsList.appendChild(appointmentDiv);
        });
    }

    modal.style.display = 'block';
}

function updatePrayerTimesDisplay() {
    renderCalendar();
}

async function loadCulturalEvents() {
    try {
        const response = await fetch(`https://holidays.abstractapi.com/v1/?api_key=3b4cbcb2ca6d4ce7b1386d8a8b6fb062&country=SG&year=${currentYear}&month=${currentMonth + 1}`);
        if (!response.ok) {
            loadDemoCulturalEvents();
            return;
        }
        const data = await response.json();
        const monthStart = new Date(currentYear, currentMonth, 1);
        const monthEnd = new Date(currentYear, currentMonth + 1, 0);
        for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            delete culturalEvents[dateStr];
        }
        data.forEach(event => {
            const eventDate = new Date(event.date);
            const dateStr = eventDate.toISOString().split('T')[0];
            if (!culturalEvents[dateStr]) {
                culturalEvents[dateStr] = [];
            }
            culturalEvents[dateStr].push({
                name: event.name,
                description: event.description || 'Cultural celebration',
                type: event.type
            });
        });
        renderCalendar();
        showApiStatus('Cultural events loaded successfully', 'success');
    } catch (error) {
        console.error('Error loading cultural events:', error);
        loadDemoCulturalEvents();
        showApiStatus('Using demo cultural events data', 'error');
    }
}

function loadDemoCulturalEvents() {
    const demoEvents = {
        '2025-01-01': [{name: 'New Year\'s Day', description: 'Start of the new year'}],
        '2025-01-25': [{name: 'Chinese New Year', description: 'Year of the Snake'}],
        '2025-02-14': [{name: 'Valentine\'s Day', description: 'Day of love'}],
        '2025-03-17': [{name: 'St. Patrick\'s Day', description: 'Irish cultural celebration'}],
        '2025-04-13': [{name: 'Songkran', description: 'Thai New Year water festival'}],
        '2025-05-01': [{name: 'Labour Day', description: 'Workers\' rights celebration'}],
        '2025-06-15': [{name: 'Hari Raya Puasa', description: 'End of Ramadan celebration'}],
        '2025-07-04': [{name: 'Independence Day', description: 'US national holiday'}],
        '2025-08-09': [{name: 'National Day', description: 'Singapore National Day'}],
        '2025-09-15': [{name: 'Mid-Autumn Festival', description: 'Chinese harvest festival'}],
        '2025-10-31': [{name: 'Halloween', description: 'Spooky celebration'}],
        '2025-11-11': [{name: 'Deepavali', description: 'Festival of lights'}],
        '2025-12-25': [{name: 'Christmas Day', description: 'Christian celebration'}]
    };
    Object.assign(culturalEvents, demoEvents);
    renderCalendar();
}

async function loadPrayerTimes(date) {
    try {
        const dateStr = date.toISOString().split('T')[0];
        const prayerTimesDiv = document.getElementById('prayerTimes');
        prayerTimesDiv.innerHTML = '<div class="loading">Loading prayer times...</div>';
        const response = await fetch(`https://api.aladhan.com/v1/timingsByCity/${dateStr}?city=${currentLocation}&country=&method=2`);
        if (!response.ok) {
            throw new Error('Failed to load prayer times');
        }
        const data = await response.json();
        const timings = data.data.timings;
        const prayerNames = {
            'Fajr': 'Fajr',
            'Dhuhr': 'Dhuhr',
            'Asr': 'Asr',
            'Maghrib': 'Maghrib',
            'Isha': 'Isha'
        };
        prayerTimesDiv.innerHTML = '';
        Object.entries(prayerNames).forEach(([key, name]) => {
            if (timings[key]) {
                const prayerDiv = document.createElement('div');
                prayerDiv.className = 'prayer-time-item';
                prayerDiv.innerHTML = `
                    <div class="prayer-name">${name}</div>
                    <div class="prayer-time-display">${timings[key]}</div>
                `;
                prayerTimesDiv.appendChild(prayerDiv);
            }
        });
        showApiStatus('Prayer times loaded successfully', 'success');
    } catch (error) {
        console.error('Error loading prayer times:', error);
        document.getElementById('prayerTimes').innerHTML = `
            <div class="prayer-time-item">
                <div class="prayer-name">Demo Prayer Times</div>
                <div class="prayer-time-display">Fajr: 5:30 AM</div>
            </div>
            <div class="prayer-time-item">
                <div class="prayer-name"></div>
                <div class="prayer-time-display">Dhuhr: 1:00 PM</div>
            </div>
            <div class="prayer-time-item">
                <div class="prayer-name"></div>
                <div class="prayer-time-display">Asr: 4:30 PM</div>
            </div>
            <div class="prayer-time-item">
                <div class="prayer-name"></div>
                <div class="prayer-time-display">Maghrib: 7:15 PM</div>
            </div>
            <div class="prayer-time-item">
                <div class="prayer-name"></div>
                <div class="prayer-time-display">Isha: 8:30 PM</div>
            </div>
        `;
        showApiStatus('Using demo prayer times data', 'error');
    }
}

function bookAppointment() {
    const confirmed = confirm('You will be redirected to the Ministry of Health website to book your appointment. Continue?');
    if (confirmed) {
        const appointmentDate = selectedDate.toISOString().split('T')[0];
        if (!appointments[appointmentDate]) {
            appointments[appointmentDate] = [];
        }
        appointments[appointmentDate].push({
            type: 'General Consultation',
            time: '2:00 PM',
            doctor: 'Dr. Smith',
            status: 'Confirmed'
        });
        saveAppointments();
        renderCalendar();
        showDayDetails(selectedDate);
        showApiStatus('Appointment booked successfully!', 'success');
    }
}

function loadAppointments() {
    const saved = localStorage.getItem('appointments');
    if (saved) {
        try {
            appointments = JSON.parse(saved);
        } catch (error) {
            console.error('Error loading appointments:', error);
        }
    }
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const todayStr = today.toISOString().split('T')[0];
    const nextWeekStr = nextWeek.toISOString().split('T')[0];
    if (!appointments[todayStr]) {
        appointments[todayStr] = [];
    }
    if (!appointments[nextWeekStr]) {
        appointments[nextWeekStr] = [];
    }
    if (appointments[todayStr].length === 0) {
        appointments[todayStr].push({
            type: 'Annual Checkup',
            time: '10:00 AM',
            doctor: 'Dr. Johnson',
            status: 'Confirmed'
        });
    }
    if (appointments[nextWeekStr].length === 0) {
        appointments[nextWeekStr].push({
            type: 'Blood Test',
            time: '3:00 PM',
            doctor: 'Dr. Lee',
            status: 'Confirmed'
        });
    }
}

// Appointment API calls for MSSQL backend

async function fetchAppointments(dateStr) {
    const res = await fetch(`/api/appointments?date=${encodeURIComponent(dateStr)}`);
    if (!res.ok) throw new Error('Failed to fetch appointments');
    return await res.json();
}

async function createAppointment(appointment) {
    const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointment)
    });
    if (!res.ok) throw new Error('Failed to create appointment');
    return await res.json();
}

async function updateAppointment(id, appointment) {
    const res = await fetch(`/api/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointment)
    });
    if (!res.ok) throw new Error('Failed to update appointment');
    return await res.json();
}

async function deleteAppointment(id) {
    const res = await fetch(`/api/appointments/${id}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete appointment');
    return await res.json();
}