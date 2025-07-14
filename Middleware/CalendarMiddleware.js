function showApiStatus(message, type) {
    const statusDiv = document.getElementById('apiStatus');
    statusDiv.textContent = message;
    statusDiv.className = `api-status ${type}`;
    statusDiv.style.display = 'block';
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 3000);
}

function saveAppointments() {
    localStorage.setItem('appointments', JSON.stringify(appointments));
}