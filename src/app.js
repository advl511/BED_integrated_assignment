// User data (normally loaded from database)
let userData = {
    id: 1,
    name: "Ahmad bin Hassan",
    age: 68,
    phone: "+65 9123 4567",
    address: "Blk 123 Woodlands Ave 1, #05-123",
    emergency: "+65 9234 5678",
    medical: "Diabetes, High Blood Pressure",
    allergies: "Penicillin, Shellfish",
    fontSize: "medium",
    notifications: "all",
    language: "en"
};

// Database simulation functions
async function loadUserData() {
    try {
        // Simulate API call to fetch user data
        // In real implementation: fetch('/api/user/profile')
        console.log('Loading user data from database...');
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Update UI with user data
        updateProfileDisplay();
        applyUserSettings();
        
    } catch (error) {
        console.error('Error loading user data:', error);
        showStatusMessage('Error loading profile data', 'error');
    }
}

async function saveUserData(field, value) {
    try {
        // Show loading state
        document.body.classList.add('loading');
        
        // Simulate API call to save data
        // In real implementation: fetch('/api/user/profile', { method: 'PUT', body: JSON.stringify({field, value}) })
        console.log(`Saving ${field}: ${value} to database...`);
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Update local data
        userData[field] = value;
        
        // Update display
        updateProfileDisplay();
        if (field === 'fontSize' || field === 'notifications' || field === 'language') {
            applyUserSettings();
        }
        
        showStatusMessage('Profile updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error saving user data:', error);
        showStatusMessage('Error saving changes', 'error');
    } finally {
        document.body.classList.remove('loading');
    }
}

function updateProfileDisplay() {
            // Update profile header
            document.getElementById('profile-name').textContent = userData.name;
            document.getElementById('profile-avatar').textContent = userData.name.charAt(0).toUpperCase();
            
            // Update profile fields
            document.getElementById('display-name').textContent = userData.name;
            document.getElementById('display-age').textContent = userData.age;
            document.getElementById('display-phone').textContent = userData.phone;
            document.getElementById('display-address').textContent = userData.address;
            document.getElementById('display-emergency').textContent = userData.emergency;
            document.getElementById('display-medical').textContent = userData.medical;
            document.getElementById('display-allergies').textContent = userData.allergies;
            
            // Update form fields
            document.getElementById('font-size').value = userData.fontSize;
            document.getElementById('notifications').value = userData.notifications;
            document.getElementById('language').value = userData.language;
        }

        function applyUserSettings() {
            // Apply font size
            document.body.className = document.body.className.replace(/font-\w+/g, '');
            document.body.classList.add(`font-${userData.fontSize}`);
            
            // Apply other settings as needed
            console.log(`Applied settings: fontSize=${userData.fontSize}, notifications=${userData.notifications}, language=${userData.language}`);
        }

        function editField(field) {
            const displayElement = document.getElementById(`display-${field}`);
            const currentValue = userData[field];
            
            // Create input element
            const input = document.createElement('input');
            input.type = field === 'age' ? 'number' : 'text';
            input.className = 'profile-input';
            input.value = currentValue;
            input.style.width = '100%';
            
            // Replace display with input
            const container = displayElement.parentElement;
            container.replaceChild(input, displayElement);
            
            // Focus on input
            input.focus();
            input.select();
            
            // Create save button
            const saveBtn = document.createElement('button');
            saveBtn.className = 'save-btn';
            saveBtn.textContent = 'Save';
            saveBtn.onclick = () => saveField(field, input.value);
            
            // Replace edit button with save button
            const editBtn = container.querySelector('.edit-btn');
            container.replaceChild(saveBtn, editBtn);
            
            // Save on Enter key
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveField(field, input.value);
                }
            });
        }

        async function saveField(field, value) {
            if (value.trim() === '') {
                showStatusMessage('Please enter a valid value', 'error');
                return;
            }
            
            await saveUserData(field, value.trim());
            
            // Restore original UI
            const input = document.querySelector('.profile-input');
            const saveBtn = document.querySelector('.save-btn');
            const container = input.parentElement;
            
            // Restore display element
            const displayElement = document.createElement('span');
            displayElement.className = 'profile-value';
            displayElement.id = `display-${field}`;
            displayElement.textContent = value.trim();
            container.replaceChild(displayElement, input);
            
            // Restore edit button
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.textContent = 'Edit';
            editBtn.onclick = () => editField(field);
            container.replaceChild(editBtn, saveBtn);
        }

        async function updateSetting(setting, value) {
            await saveUserData(setting, value);
        }

        function showStatusMessage(message, type) {
            const statusDiv = document.getElementById('status-message');
            statusDiv.textContent = message;
            statusDiv.className = `status-message status-${type}`;
            
            // Auto-hide after 3 seconds
            setTimeout(() => {
                statusDiv.textContent = '';
                statusDiv.className = '';
            }, 3000);
        }

        // Tab switching functionality
        function switchTab(tabName) {
            // Remove active class from all tabs and nav items
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.nav-item').forEach(nav => {
                nav.classList.remove('active');
            });
            
            // Add active class to selected tab and nav item
            document.getElementById(`${tabName}-tab`).classList.add('active');
            document.querySelectorAll(`[data-tab="${tabName}"]`).forEach(nav => {
                nav.classList.add('active');
            });
            
            // Load profile data when switching to profile tab
            if (tabName === 'profile') {
                loadUserData();
            }
        }

        // Navigation event listeners
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const tabName = this.getAttribute('data-tab');
                switchTab(tabName);
            });
        });

        function updateTime() {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit', 
                hour12: true 
            });
            const dateString = now.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            
            document.getElementById('current-time').textContent = timeString;
            document.getElementById('current-date').textContent = dateString;
        }

        // Mobile navigation toggle
        const mobileNavToggle = document.getElementById('mobile-nav-toggle');
        const navDropdown = document.getElementById('nav-dropdown');

        mobileNavToggle.addEventListener('click', function() {
            navDropdown.classList.toggle('show');
            mobileNavToggle.classList.toggle('active');
        });

        // Close mobile nav when clicking on a nav item
        document.querySelectorAll('.nav-dropdown .nav-item').forEach(item => {
            item.addEventListener('click', function() {
                navDropdown.classList.remove('show');
                mobileNavToggle.classList.remove('active');
            });
        });

        // Close mobile nav when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.nav')) {
                navDropdown.classList.remove('show');
                mobileNavToggle.classList.remove('active');
            }
        });

        // Update time every minute
        updateTime();
        setInterval(updateTime, 60000);

        // Add click feedback for buttons
        document.querySelectorAll('.action-btn, .nav-item').forEach(btn => {
            btn.addEventListener('click', function(e) {
                if (!this.getAttribute('data-tab')) {
                    e.preventDefault();
                    this.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        this.style.transform = '';
                    }, 150);
                }
            });
        });

        // Initialize the application
        document.addEventListener('DOMContentLoaded', function() {
            // Load user settings and apply them
            applyUserSettings();
            
            // If starting on profile tab, load the data
            if (window.location.hash === '#profile') {
                switchTab('profile');
            }
        });