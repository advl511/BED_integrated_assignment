// Home page JavaScript functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Home page loaded successfully');
    
    // Initialize the page
    initializePage();
    updateTimeDisplay();
    setupNavigation();
    checkUserAuthentication();
    
    // Setup edit button event listeners as fallback
    setupEditButtons();
    
    // Update time every minute
    setInterval(updateTimeDisplay, 60000);
});

function initializePage() {
    console.log('Initializing home page...');
    
    // Check if user is logged in and update UI accordingly
    const userId = localStorage.getItem('user_id');
    const username = localStorage.getItem('username');
    
    if (userId && username) {
        console.log('User is logged in:', username);
        updateLoginSection(username);
        
        // Load saved settings
        loadSavedSettings();
    } else {
        console.log('User is not logged in');
    }
}

function updateTimeDisplay() {
    const now = new Date();
    
    // Update time
    const timeString = now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
    });
    
    // Update date
    const dateString = now.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    const timeElement = document.getElementById('current-time');
    const dateElement = document.getElementById('current-date');
    
    if (timeElement) timeElement.textContent = timeString;
    if (dateElement) dateElement.textContent = dateString;
}

function setupNavigation() {
    // Handle navigation clicks
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            const tabName = this.getAttribute('data-tab');
            
            // Special handling for external pages - navigate directly
            if (tabName === 'map' || href === 'friends.html' || href === 'Calendar.html' || href.includes('.html')) {
                return; // Let the default link behavior happen
            }

            
            // For other tabs, prevent default and switch tab (only for home page tabs)
            e.preventDefault();
            if (tabName) {
                switchTab(tabName);
            }
        });
    });


    
    // Mobile navigation toggle
    const mobileNavToggle = document.getElementById('mobile-nav-toggle');
    const navDropdown = document.getElementById('nav-dropdown');
    
    if (mobileNavToggle && navDropdown) {
        mobileNavToggle.addEventListener('click', function() {
            navDropdown.classList.toggle('show');
            this.classList.toggle('active');
        });
        
        // Close mobile nav when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.nav')) {
                navDropdown.classList.remove('show');
                mobileNavToggle.classList.remove('active');
            }
        });
    }
}

function switchTab(tabName) {
    console.log('Switching to tab:', tabName);
    
    // Remove active class from all tabs and nav items
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
    });
    
    // Add active class to selected tab and nav item
    const targetTab = document.getElementById(`${tabName}-tab`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    document.querySelectorAll(`[data-tab="${tabName}"]`).forEach(nav => {
        nav.classList.add('active');
    });
    
    // Handle special tab actions
    if (tabName === 'profile') {
        loadUserProfile();
    }
}

// Function to setup edit button event listeners
function setupEditButtons() {
    // Use a slight delay to ensure DOM is fully rendered
    setTimeout(() => {
        const editButtons = document.querySelectorAll('.edit-btn');
        editButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Get field name from onclick attribute
                const onclickAttr = this.getAttribute('onclick');
                if (onclickAttr) {
                    const match = onclickAttr.match(/editField\('([^']+)'\)/);
                    if (match) {
                        const fieldName = match[1];
                        console.log('Edit button clicked for field:', fieldName);
                        editField(fieldName);
                    }
                }
            });
        });
        
        console.log('Setup event listeners for', editButtons.length, 'edit buttons');
    }, 100);
}

function updateLoginSection(username) {
    const loginSection = document.querySelector('.login-section');
    if (loginSection) {
        loginSection.innerHTML = `
            <div class="user-info">
                <span class="username">Welcome, ${username}</span>
                <button class="logout-btn" onclick="handleLogout()">Logout</button>
            </div>
        `;
    }
}

function checkUserAuthentication() {
    // Check if user session is still valid
    const authToken = localStorage.getItem('auth_token');
    const userId = localStorage.getItem('user_id');
    
    if (authToken && userId) {
        // Optionally verify token with server
        verifyTokenWithServer(authToken);
    }
}

async function verifyTokenWithServer(token) {
    try {
        const apiBaseUrl = "http://localhost:3000";
        const response = await fetch(`${apiBaseUrl}/auth/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            console.log('Token verification failed, clearing localStorage');
            clearUserData();
        } else {
            const data = await response.json();
            console.log('Token verified successfully:', data.user);
            // Update UI with verified user data if needed
            updateLoginSection(data.user.username);
        }
    } catch (error) {
        console.error('Token verification error:', error);
    }
}

function loadUserProfile() {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
        console.log('No user ID found, redirecting to login');
        window.location.href = 'signin.html';
        return;
    }
    
    console.log('Loading profile for user:', userId);
    
    // Load user data from API
    loadUserData(userId);
}

async function loadUserData(userId) {
    try {
        const token = localStorage.getItem('auth_token');
        
        // Load both user basic data and profile data
        const [userResponse, profileResponse] = await Promise.all([
            fetch(`http://localhost:3000/api/users/${userId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }),
            fetch(`http://localhost:3000/api/profiles/${userId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
        ]);

        if (!userResponse.ok) {
            throw new Error('Failed to load user data');
        }

        const userData = await userResponse.json();
        let profileData = {};
        
        // Profile data might not exist yet, so handle gracefully
        if (profileResponse.ok) {
            profileData = await profileResponse.json();
        } else if (profileResponse.status === 404) {
            console.log('Profile not found, will create default profile');
            // Create default profile
            await createDefaultProfile(userId);
            profileData = {}; // Use empty object for now
        } else {
            console.warn('Failed to load profile data, using defaults');
        }
        
        console.log('User data loaded:', userData);
        console.log('Profile data loaded:', profileData);
        
        // Update profile display with combined data
        updateProfileDisplay(userData, profileData);
        
        // Load saved settings from profile
        loadProfileSettings(profileData);
        
    } catch (error) {
        console.error('Error loading user data:', error);
        showStatusMessage('Failed to load profile data', 'error');
    }
}

function updateProfileDisplay(userData, profileData = {}) {
    // Update profile header
    document.getElementById('profile-name').textContent = 
        `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username;
    
    // Update profile avatar with first letter of name
    const avatar = document.getElementById('profile-avatar');
    if (userData.first_name) {
        avatar.textContent = userData.first_name.charAt(0).toUpperCase();
    } else if (userData.username) {
        avatar.textContent = userData.username.charAt(0).toUpperCase();
    }
    
    // Update profile fields with both user and profile data
    document.getElementById('display-name').textContent = 
        `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Not set';
    document.getElementById('display-age').textContent = userData.age || 'Not set';
    document.getElementById('display-phone').textContent = userData.phone_number || 'Not set';
    
    // Update fields from profiles table
    document.getElementById('display-address').textContent = profileData.address || 'Not set';
    document.getElementById('display-emergency').textContent = profileData.emergency_contact || 'Not set';
    document.getElementById('display-medical').textContent = profileData.medical_notes || 'Not set';  
    document.getElementById('display-allergies').textContent = profileData.allergies || 'Not set';
}

// Function to handle field editing
function editField(fieldName) {
    console.log('EditField called with:', fieldName);
    
    // Check if user is logged in
    const userId = localStorage.getItem('user_id');
    if (!userId) {
        alert('Please log in to edit your profile');
        return;
    }
    
    const displayElement = document.getElementById(`display-${fieldName}`);
    if (!displayElement) {
        console.error(`Display element not found for field: ${fieldName}`);
        alert('Field not found. Please try again.');
        return;
    }
    
    const currentValue = displayElement.textContent === 'Not set' ? '' : displayElement.textContent;
    
    let inputValue;
    let inputType = 'text';
    
    // Determine input type and current value based on field
    switch(fieldName) {
        case 'name':
            inputValue = prompt('Enter your full name:', currentValue);
            break;
        case 'age':
            inputType = 'number';
            inputValue = prompt('Enter your age:', currentValue);
            if (inputValue && (inputValue < 1 || inputValue > 150)) {
                alert('Please enter a valid age between 1 and 150');
                return;
            }
            break;
        case 'phone':
            inputValue = prompt('Enter your phone number:', currentValue);
            break;
        case 'address':
            inputValue = prompt('Enter your address:', currentValue);
            break;
        case 'emergency':
            inputValue = prompt('Enter emergency contact:', currentValue);
            break;
        case 'medical':
            inputValue = prompt('Enter medical notes:', currentValue);
            break;
        case 'allergies':
            inputValue = prompt('Enter allergies:', currentValue);
            break;
        default:
            console.error('Unknown field name:', fieldName);
            alert('Unknown field. Please try again.');
            return;
    }
    
    if (inputValue !== null && inputValue !== currentValue) {
        updateUserField(fieldName, inputValue);
    }
}

// Make sure the function is globally accessible
window.editField = editField;

// Function to update user field in database
async function updateUserField(fieldName, value) {
    const userId = localStorage.getItem('user_id');
    const token = localStorage.getItem('auth_token');
    
    if (!userId || !token) {
        showStatusMessage('Authentication required', 'error');
        return;
    }
    
    try {
        let updateData = {};
        let endpoint = '';
        
        // Determine which endpoint and data structure to use
        switch(fieldName) {
            case 'name':
                // Update users table
                const nameParts = value.trim().split(' ');
                updateData.first_name = nameParts[0] || '';
                updateData.last_name = nameParts.slice(1).join(' ') || '';
                endpoint = `http://localhost:3000/api/users/${userId}`;
                break;
            case 'age':
                // Update users table
                updateData.age = parseInt(value);
                endpoint = `http://localhost:3000/api/users/${userId}`;
                break;
            case 'phone':
                // Update users table
                updateData.phone_number = value;
                endpoint = `http://localhost:3000/api/users/${userId}`;
                break;
            case 'address':
                // Update profiles table
                updateData.address = value;
                endpoint = `http://localhost:3000/api/profiles/${userId}`;
                break;
            case 'emergency':
                // Update profiles table
                updateData.emergency_contact = value;
                endpoint = `http://localhost:3000/api/profiles/${userId}`;
                break;
            case 'medical':
                // Update profiles table
                updateData.medical_notes = value;
                endpoint = `http://localhost:3000/api/profiles/${userId}`;
                break;
            case 'allergies':
                // Update profiles table
                updateData.allergies = value;
                endpoint = `http://localhost:3000/api/profiles/${userId}`;
                break;
            default:
                showStatusMessage('Unknown field type', 'error');
                return;
        }
        
        const response = await fetch(endpoint, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update data');
        }
        
        const updatedData = await response.json();
        console.log('Data updated successfully:', updatedData);
        
        // Refresh the profile display
        loadUserData(userId);
        showStatusMessage('Profile updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error updating user field:', error);
        showStatusMessage(`Failed to update ${fieldName}: ${error.message}`, 'error');
    }
}

// Function to update settings (like font size, notifications, language)
async function updateSetting(settingName, value) {
    console.log(`Updating setting ${settingName} to ${value}`);
    
    const userId = localStorage.getItem('user_id');
    const token = localStorage.getItem('auth_token');
    
    if (!userId || !token) {
        showStatusMessage('Authentication required', 'error');
        return;
    }
    
    try {
        // Apply the setting immediately
        switch(settingName) {
            case 'fontSize':
                updateFontSize(value);
                break;
            case 'notifications':
                // Just for immediate feedback
                break;
            case 'language':
                // Just for immediate feedback
                break;
        }
        
        // Save to database (profiles table)
        let updateData = {};
        switch(settingName) {
            case 'fontSize':
                updateData.font_size = value;
                break;
            case 'notifications':
                updateData.notifications = value;
                break;
            case 'language':
                updateData.preferred_language = value;
                break;
            default:
                showStatusMessage('Unknown setting', 'error');
                return;
        }
        
        const response = await fetch(`http://localhost:3000/api/profiles/${userId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update setting');
        }
        
        // Also save to localStorage for quick access
        localStorage.setItem(`setting_${settingName}`, value);
        showStatusMessage(`${settingName} updated successfully!`, 'success');
        
    } catch (error) {
        console.error('Error updating setting:', error);
        showStatusMessage(`Failed to update ${settingName}: ${error.message}`, 'error');
    }
}

function updateFontSize(size) {
    const multiplier = {
        'small': 0.8,
        'medium': 1.0,
        'large': 1.2,
        'extra-large': 1.4
    }[size] || 1.0;
    
    document.documentElement.style.setProperty('--font-size-multiplier', multiplier);
}

function updateNotificationPreference(preference) {
    // This would typically update user preferences in the database
    console.log('Notification preference updated to:', preference);
}

function updateLanguagePreference(language) {
    // This would typically update the UI language
    console.log('Language preference updated to:', language);
}

// Function to show status messages
function showStatusMessage(message, type = 'info') {
    const statusDiv = document.getElementById('status-message');
    if (!statusDiv) return;
    
    statusDiv.className = type;
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
    
    // Hide message after 3 seconds
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 3000);
}

// Load saved settings on page load
function loadSavedSettings() {
    const fontSize = localStorage.getItem('setting_fontSize') || 'medium';
    const notifications = localStorage.getItem('setting_notifications') || 'all';
    const language = localStorage.getItem('setting_language') || 'en';
    
    // Update UI elements
    const fontSizeSelect = document.getElementById('font-size');
    const notificationsSelect = document.getElementById('notifications');
    const languageSelect = document.getElementById('language');
    
    if (fontSizeSelect) {
        fontSizeSelect.value = fontSize;
        updateFontSize(fontSize);
    }
    if (notificationsSelect) notificationsSelect.value = notifications;
    if (languageSelect) languageSelect.value = language;
}

// Load profile settings from database
function loadProfileSettings(profileData) {
    if (!profileData) return;
    
    // Update UI elements with database values
    const fontSizeSelect = document.getElementById('font-size');
    const notificationsSelect = document.getElementById('notifications');
    const languageSelect = document.getElementById('language');
    
    if (fontSizeSelect && profileData.font_size) {
        fontSizeSelect.value = profileData.font_size;
        updateFontSize(profileData.font_size);
        localStorage.setItem('setting_fontSize', profileData.font_size);
    }
    if (notificationsSelect && profileData.notifications) {
        notificationsSelect.value = profileData.notifications;
        localStorage.setItem('setting_notifications', profileData.notifications);
    }
    if (languageSelect && profileData.preferred_language) {
        languageSelect.value = profileData.preferred_language;
        localStorage.setItem('setting_language', profileData.preferred_language);
    }
}

// Create default profile for new users
async function createDefaultProfile(userId) {
    const token = localStorage.getItem('auth_token');
    
    try {
        const defaultProfile = {
            bio: '',
            location: '',
            website: '',
            birthday: null,
            privacy_settings: '{}',
            profile_picture_url: null,
            address: '',
            emergency_contact: '',
            medical_notes: '',
            allergies: '',
            font_size: 'medium',
            notifications: 'all',
            preferred_language: 'en'
        };
        
        const response = await fetch(`http://localhost:3000/api/profiles/${userId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(defaultProfile)
        });
        
        if (!response.ok) {
            console.warn('Failed to create default profile');
        } else {
            console.log('Default profile created successfully');
        }
    } catch (error) {
        console.error('Error creating default profile:', error);
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        clearUserData();
        window.location.href = 'signin.html';
    }
}

function clearUserData() {
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    localStorage.removeItem('auth_token');
    console.log('User data cleared from localStorage');
}

// Add click feedback for buttons
document.addEventListener('click', function(e) {
    if (e.target.matches('.nav-item, button')) {
        e.target.style.transform = 'scale(0.95)';
        setTimeout(() => {
            e.target.style.transform = '';
        }, 150);
    }
});

console.log('Home page script loaded successfully');
