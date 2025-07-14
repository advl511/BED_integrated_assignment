async function loadUserSettings(userId) {
    try {
        const response = await fetch(`/api/settings/${userId}`);
        const settings = await response.json();
        return settings;
    } catch (error) {
        console.error('Error loading settings:', error);
        return null;
    }
}

async function saveUserSettings(userId, settings) {
    try {
        const response = await fetch(`/api/settings/${userId}`, {
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
        const response = await fetch(`/api/appointments?date=${date}`);
        const appointments = await response.json();
        return appointments;
    } catch (error) {
        console.error('Error loading appointments:', error);
        return [];
    }
}