// API configuration for Profile Management
const API_BASE_URL = 'http://localhost:3000/api';

// Global variables
let currentUser = null;

// API utility functions
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Authentication functions
async function getCurrentUser() {
    const userId = localStorage.getItem('user_id');
    const username = localStorage.getItem('username');
    const email = localStorage.getItem('email');
    
    if (userId && username && email) {
        currentUser = { user_id: parseInt(userId), username, email };
        window.currentUser = currentUser; // Make it globally accessible
        return currentUser;
    }
    
    // Redirect to login if no user data
    window.location.href = '../account_creation/signin.html';
    return null;
}

function logout() {
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    currentUser = null;
    window.location.href = '../account_creation/signin.html';
}

// Profile API functions
async function getProfile(userId) {
    try {
        return await apiRequest(`/profiles/${userId}`);
    } catch (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
}

async function updateProfile(userId, profileData) {
    try {
        return await apiRequest(`/profiles/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        throw error;
    }
}

async function uploadProfilePicture(userId, file) {
    try {
        const formData = new FormData();
        formData.append('profilePicture', file);
        
        return await fetch(`${API_BASE_URL}/profiles/${userId}/picture`, {
            method: 'POST',
            body: formData
        }).then(response => response.json());
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        throw error;
    }
}

async function updateUserProfile(userId, profileData) {
    try {
        return await apiRequest(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    } catch (error) {
        console.error('Error updating user profile:', error);
        throw error;
    }
}

async function getUserProfile(userId) {
    try {
        return await apiRequest(`/users/${userId}`);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
    }
}

// Utility functions
function showError(message, container = null) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    
    if (container) {
        container.insertBefore(errorDiv, container.firstChild);
    } else {
        document.body.insertBefore(errorDiv, document.body.firstChild);
    }
    
    // Remove error after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

function showSuccess(message, container = null) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success';
    successDiv.textContent = message;
    
    if (container) {
        container.insertBefore(successDiv, container.firstChild);
    } else {
        document.body.insertBefore(successDiv, document.body.firstChild);
    }
    
    // Remove success message after 3 seconds
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

function formatTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    return time.toLocaleDateString();
}

// Font size management
let fontSizeMultiplier = 1;

function adjustFontSize(delta) {
    fontSizeMultiplier = Math.max(0.5, Math.min(2, fontSizeMultiplier + delta));
    document.documentElement.style.setProperty('--font-size-multiplier', fontSizeMultiplier);
    localStorage.setItem('fontSizeMultiplier', fontSizeMultiplier);
}

function resetFontSize() {
    fontSizeMultiplier = 1;
    document.documentElement.style.setProperty('--font-size-multiplier', fontSizeMultiplier);
    localStorage.removeItem('fontSizeMultiplier');
}

// Load saved font size on page load
function loadFontSize() {
    const saved = localStorage.getItem('fontSizeMultiplier');
    if (saved) {
        fontSizeMultiplier = parseFloat(saved);
        document.documentElement.style.setProperty('--font-size-multiplier', fontSizeMultiplier);
    }
}

// Tab management
function showTab(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    const navTabs = document.querySelectorAll('.nav-tab');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    navTabs.forEach(tab => tab.classList.remove('active'));
    
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
    
    // Load data when switching to tabs
    if (tabName === 'friends') {
        loadFriends();
    } else if (tabName === 'status') {
        // Initialize status functionality if not already done
        if (typeof initializeStatus === 'function') {
            initializeStatus();
        } else if (typeof loadStatuses === 'function') {
            loadStatuses();
        }
    }
}

// Profile management
let currentProfile = null;

async function loadProfile() {
    try {
        if (!currentUser) return;
        
        // Load user profile data from API
        const userProfile = await getUserProfile(currentUser.user_id);
        
        // Also try to load profile data (which includes profile picture)
        let profileData = null;
        try {
            profileData = await getProfile(currentUser.user_id);
        } catch (profileError) {
            console.log('Profile data not found, will use user data only');
        }
        
        if (userProfile) {
            // Merge user profile with profile data
            currentProfile = { ...userProfile, ...profileData };
            updateProfileDisplay();
        } else {
            // Use basic user data if profile loading fails
            updateProfileDisplayBasic();
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        // Use basic user data if profile loading fails
        updateProfileDisplayBasic();
    }
}

async function createDefaultProfile() {
    try {
        const defaultProfile = {
            bio: '',
            location: '',
            website: '',
            birthday: null,
            privacy_settings: {
                profile_visibility: 'public',
                show_email: false,
                show_birthday: false
            }
        };
        
        currentProfile = await updateProfile(currentUser.user_id, defaultProfile);
        updateProfileDisplay();
    } catch (error) {
        console.error('Error creating default profile:', error);
        updateProfileDisplayBasic();
    }
}

function updateProfileDisplay() {
    const usernameElement = document.getElementById('username');
    
    if (usernameElement) {
        usernameElement.textContent = currentUser.username;
    }
    
    // Update profile details
    if (currentProfile) {
        updateProfileDetails();
    }
    
    // Load profile picture if exists
    if (currentProfile && currentProfile.profile_picture_url) {
        loadProfilePicture(currentProfile.profile_picture_url);
    }
}

function updateProfileDetails() {
    if (!currentProfile) return;
    
    // Update profile details display
    document.getElementById('fullName').textContent = 
        currentProfile.first_name && currentProfile.last_name && 
        currentProfile.first_name !== 'N/A' && currentProfile.last_name !== 'N/A'
        ? `${currentProfile.first_name} ${currentProfile.last_name}` 
        : 'Not set';
    
    document.getElementById('phoneNumber').textContent = 
        currentProfile.phone_number && currentProfile.phone_number !== 'N/A' 
        ? currentProfile.phone_number 
        : 'Not set';
    
    document.getElementById('age').textContent = 
        currentProfile.age && currentProfile.age > 0 
        ? currentProfile.age 
        : 'Not set';
    
    document.getElementById('gender').textContent = 
        currentProfile.gender && currentProfile.gender !== 'Prefer not to say' 
        ? currentProfile.gender 
        : 'Not set';
    
    if (currentProfile.date_of_birth && currentProfile.date_of_birth !== '2000-01-01') {
        const birthDate = new Date(currentProfile.date_of_birth);
        document.getElementById('birthday').textContent = birthDate.toLocaleDateString();
    } else {
        document.getElementById('birthday').textContent = 'Not set';
    }
    
    document.getElementById('race').textContent = 
        currentProfile.race && currentProfile.race !== 'N/A' 
        ? currentProfile.race 
        : 'Not set';
    
    document.getElementById('nationality').textContent = 
        currentProfile.nationality && currentProfile.nationality !== 'N/A' 
        ? currentProfile.nationality 
        : 'Not set';
}

function updateProfileDisplayBasic() {
    const usernameElement = document.getElementById('username');
    if (usernameElement && currentUser) {
        usernameElement.textContent = currentUser.username;
    }
}

function loadProfilePicture(url) {
    const profilePic = document.getElementById('profilePic');
    if (profilePic) {
        profilePic.style.backgroundImage = `url(${url})`;
        profilePic.style.backgroundSize = 'cover';
        profilePic.style.backgroundPosition = 'center';
        profilePic.innerHTML = '';
    }
}

// Profile picture upload
function uploadProfilePic() {
    document.getElementById('profilePicInput').click();
}

document.addEventListener('DOMContentLoaded', function() {
    const profilePicInput = document.getElementById('profilePicInput');
    if (profilePicInput) {
        profilePicInput.addEventListener('change', async function(event) {
            const file = event.target.files[0];
            if (file && currentUser) {
                try {
                    // Show loading state
                    const profilePic = document.getElementById('profilePic');
                    const originalContent = profilePic.innerHTML;
                    profilePic.innerHTML = '⏳';
                    
                    // Upload the file
                    const result = await uploadProfilePicture(currentUser.user_id, file);
                    
                    if (result.profile_picture_url) {
                        // Update current profile object
                        if (!currentProfile) currentProfile = {};
                        currentProfile.profile_picture_url = result.profile_picture_url;
                        
                        loadProfilePicture(result.profile_picture_url);
                        showSuccess('Profile picture updated successfully!');
                    }
                } catch (error) {
                    console.error('Error uploading profile picture:', error);
                    showError('Failed to upload profile picture. Please try again.');
                    
                    // Restore original content on error
                    const profilePic = document.getElementById('profilePic');
                    profilePic.innerHTML = originalContent;
                }
            }
        });
    }
    
    // Edit profile form submission
    const editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', saveProfileChanges);
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const editModal = document.getElementById('editProfileModal');
        if (event.target === editModal) {
            closeEditProfileModal();
        }
    });
    
    // Load font size preference
    loadFontSize();
    
    // Initialize the profile when DOM is loaded
    initializeProfile();
});

// Profile editing functions
function openEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    if (modal) {
        // Initialize currentProfile if it doesn't exist
        if (!currentProfile) {
            currentProfile = {};
        }
        
        // Pre-fill the form with current profile data
        document.getElementById('editFirstName').value = currentProfile.first_name || '';
        document.getElementById('editLastName').value = currentProfile.last_name || '';
        document.getElementById('editPhoneNumber').value = currentProfile.phone_number || '';
        document.getElementById('editAge').value = currentProfile.age || '';
        document.getElementById('editGender').value = currentProfile.gender || '';
        document.getElementById('editDateOfBirth').value = currentProfile.date_of_birth || '';
        document.getElementById('editRace').value = currentProfile.race || '';
        document.getElementById('editNationality').value = currentProfile.nationality || '';
        
        modal.style.display = 'block';
    }
}

function closeEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function saveProfileChanges(event) {
    event.preventDefault();
    
    if (!currentUser) {
        showError('User not logged in');
        return;
    }
    
    const formData = new FormData(event.target);
    const profileData = {
        first_name: formData.get('first_name') || 'N/A',
        last_name: formData.get('last_name') || 'N/A',
        phone_number: formData.get('phone_number') || 'N/A',
        race: formData.get('race') || 'N/A',
        age: parseInt(formData.get('age')) || 0,
        gender: formData.get('gender') || 'Prefer not to say',
        date_of_birth: formData.get('date_of_birth') || '2000-01-01',
        nationality: formData.get('nationality') || 'N/A'
    };
    
    try {
        await updateUserProfile(currentUser.user_id, profileData);
        
        // Update current profile data
        if (!currentProfile) currentProfile = {};
        Object.assign(currentProfile, profileData);
        
        // Update the display
        updateProfileDetails();
        
        // Close modal and show success message
        closeEditProfileModal();
        showSuccess('Profile updated successfully!');
    } catch (error) {
        console.error('Error updating profile:', error);
        showError('Failed to update profile. Please try again.');
    }
}

function editProfile() {
    openEditProfileModal();
}

function updateUserStatus(status) {
    const statusElement = document.getElementById('currentStatus');
    if (statusElement) {
        statusElement.textContent = status;
    }
}

// Initialize Profile Application
function initializeProfile() {
    // Load font size preference first
    loadFontSize();
    
    // Get current user and load profile
    getCurrentUser().then(user => {
        if (user) {
            currentUser = user;
            loadProfile();
        }
    }).catch(error => {
        console.error('Error initializing profile:', error);
        // Set default values if user data is not available
        setDefaultProfileData();
    });
}

// Set default profile data for demo purposes
function setDefaultProfileData() {
    document.getElementById('username').textContent = 'Demo User';
    document.getElementById('fullName').textContent = 'Demo User';
    document.getElementById('phoneNumber').textContent = 'Not set';
    document.getElementById('age').textContent = 'Not set';
    document.getElementById('gender').textContent = 'Not set';
    document.getElementById('birthday').textContent = 'Not set';
    document.getElementById('race').textContent = 'Not set';
    document.getElementById('nationality').textContent = 'Not set';
}

// Utility functions for notifications
function showSuccess(message) {
    // Create a success notification
    const notification = document.createElement('div');
    notification.className = 'success';
    notification.textContent = message;
    
    // Add to container
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(notification, container.firstChild);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

function showError(message) {
    // Create an error notification
    const notification = document.createElement('div');
    notification.className = 'error';
    notification.textContent = message;
    
    // Add to container
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(notification, container.firstChild);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
}
