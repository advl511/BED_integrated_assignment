document.addEventListener('DOMContentLoaded', function() {
    renderCalendar();
    setupEventListeners();
    loadCulturalEvents();
    loadAppointments();
});

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
document.addEventListener('DOMContentLoaded', function() {
    renderCalendar();
    setupEventListeners();
    loadCulturalEvents();
    loadAppointments();
});