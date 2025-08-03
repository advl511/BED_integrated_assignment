// Home page JavaScript functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Home page loaded successfully');
    
    // Initialize the page
    initializePage();
    updateTimeDisplay();
    setupNavigation();
    checkUserAuthentication();
    
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
            const tabName = this.getAttribute('data-tab');
            
            // Special handling for map tab - navigate directly to map.html
            if (tabName === 'map' || tabName === 'settings' || tabName === 'tts' || tabName === 'calendar') {
                return; // Let the default link behavior happen
            }

            
            // For other tabs, prevent default and switch tab
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
    // Add profile loading logic here if needed
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
