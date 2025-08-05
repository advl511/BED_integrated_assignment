// API request helper function
async function apiRequest(endpoint, options = {}) {
    const baseURL = 'http://localhost:3000';
    const url = `${baseURL}/api${endpoint}`;
    
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
}

// Friends API functions
async function getFriends(userId) {
    try {
        return await apiRequest(`/friends/${userId}`);
    } catch (error) {
        console.error('Error fetching friends:', error);
        return [];
    }
}

async function sendFriendRequest(fromUserId, toUserId) {
    try {
        return await apiRequest('/friends/request', {
            method: 'POST',
            body: JSON.stringify({ fromUserId, toUserId })
        });
    } catch (error) {
        console.error('Error sending friend request:', error);
        throw error;
    }
}

async function acceptFriendRequest(requestId) {
    try {
        return await apiRequest(`/friends/accept/${requestId}`, {
            method: 'PUT',
            body: JSON.stringify({ userId: currentUser.user_id })
        });
    } catch (error) {
        console.error('Error accepting friend request:', error);
        throw error;
    }
}

async function getPendingRequests(userId) {
    try {
        return await apiRequest(`/friends/${userId}/pending`);
    } catch (error) {
        console.error('Error fetching pending requests:', error);
        return [];
    }
}

async function getSentRequests(userId) {
    try {
        return await apiRequest(`/friends/${userId}/sent`);
    } catch (error) {
        console.error('Error fetching sent requests:', error);
        return [];
    }
}

async function rejectFriendRequest(requestId) {
    try {
        return await apiRequest(`/friends/reject/${requestId}`, {
            method: 'PUT',
            body: JSON.stringify({ userId: currentUser.user_id })
        });
    } catch (error) {
        console.error('Error rejecting friend request:', error);
        throw error;
    }
}

async function searchUsers(query) {
    try {
        return await apiRequest(`/users/search?q=${encodeURIComponent(query)}`);
    } catch (error) {
        console.error('Error searching users:', error);
        return [];
    }
}

async function getProfile(userId) {
    try {
        // First try to get profile data
        const profile = await apiRequest(`/profiles/${userId}`);
        return profile;
    } catch (error) {
        console.error('Error fetching profile:', error);
        // If profile doesn't exist, try to get user data instead
        try {
            const user = await apiRequest(`/users/${userId}`);
            return user;
        } catch (userError) {
            console.error('Error fetching user:', userError);
            return null;
        }
    }
}

// Friends management
let friends = [];
let friendRequests = [];
let sentRequests = [];

async function loadFriends() {
    try {
        if (!currentUser) return;
        
        friends = await getFriends(currentUser.user_id);
        friendRequests = await getPendingRequests(currentUser.user_id);
        sentRequests = await getSentRequests(currentUser.user_id);
        
        renderFriends();
        renderFriendRequests();
    } catch (error) {
        console.error('Error loading friends:', error);
        showError('Failed to load friends list');
        // Fallback to empty friends list
        friends = [];
        friendRequests = [];
        sentRequests = [];
        renderFriends();
        renderFriendRequests();
    }
}

function renderFriends() {
    const friendsList = document.getElementById('friendsList');
    const friendCount = document.getElementById('friendCount');
    
    if (!friendsList || !friendCount) return;
    
    friendsList.innerHTML = '';
    friendCount.textContent = friends.length;
    
    if (friends.length === 0) {
        friendsList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666; grid-column: 1 / -1;">
                <h3>No friends yet</h3>
                <p>Start by adding some friends to connect with!</p>
            </div>
        `;
        return;
    }
    
    friends.forEach(friend => {
        const friendCard = document.createElement('div');
        friendCard.className = 'friend-card';
        
        // Create profile picture element
        const avatarElement = friend.profile_picture_url 
            ? `<div class="friend-avatar" style="background-image: url('${friend.profile_picture_url}'); background-size: cover; background-position: center;"></div>`
            : `<div class="friend-avatar">${friend.username.charAt(0).toUpperCase()}</div>`;
        
        friendCard.innerHTML = `
            ${avatarElement}
            <div class="friend-info" onclick="viewFriendProfile(${friend.user_id})" style="cursor: pointer; flex: 1;">
                <h3>${friend.username}</h3>
            </div>
            <button onclick="removeFriend(${friend.user_id})" style="background: #DC3545; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; margin-left: auto;">Remove</button>
        `;
        
        friendsList.appendChild(friendCard);
    });
}

async function viewFriendProfile(friendId) {
    try {
        // Show loading state
        openFriendProfileModal();
        document.getElementById('friendUsername').textContent = 'Loading...';
        
        // Get friend profile data from backend using the combined profile endpoint
        const friendProfile = await getProfile(friendId);
        
        if (friendProfile) {
            populateFriendModal(friendProfile);
        } else {
            showError('Failed to load friend profile');
            closeFriendProfileModal();
        }
    } catch (error) {
        console.error('Error loading friend profile:', error);
        showError('Failed to load friend profile');
        closeFriendProfileModal();
    }
}

// Add friend modal management
function openAddFriendModal() {
    const modal = document.getElementById('addFriendModal');
    if (modal) {
        modal.style.display = 'flex';
        // Clear previous search results
        clearFriendSearch();
    }
}

function closeAddFriendModal() {
    const modal = document.getElementById('addFriendModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('friendName').value = '';
        clearFriendSearch();
    }
}

let searchTimeout;
let searchResults = [];

// Enhanced add friend functionality with user search
function setupFriendSearch() {
    const friendNameInput = document.getElementById('friendName');
    const friendStatusInput = document.getElementById('friendStatus');
    
    if (friendNameInput) {
        // Remove the status input since we're searching real users
        if (friendStatusInput) {
            friendStatusInput.style.display = 'none';
        }
        
        friendNameInput.placeholder = 'Search for users by username or email...';
        
        friendNameInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.trim();
            
            if (query.length >= 2) {
                searchTimeout = setTimeout(() => searchForUsers(query), 300);
            } else {
                clearFriendSearch();
            }
        });
    }
}

async function searchForUsers(query) {
    try {
        searchResults = await searchUsers(query);
        displaySearchResults();
    } catch (error) {
        console.error('Error searching users:', error);
        showError('Failed to search users');
    }
}

function displaySearchResults() {
    let searchContainer = document.getElementById('searchResults');
    
    if (!searchContainer) {
        searchContainer = document.createElement('div');
        searchContainer.id = 'searchResults';
        searchContainer.style.maxHeight = '200px';
        searchContainer.style.overflowY = 'auto';
        searchContainer.style.border = '1px solid #ddd';
        searchContainer.style.borderRadius = '8px';
        searchContainer.style.marginTop = '10px';
        
        const friendNameInput = document.getElementById('friendName');
        if (friendNameInput) {
            friendNameInput.parentNode.insertBefore(searchContainer, friendNameInput.nextSibling);
        }
    }
    
    searchContainer.innerHTML = '';
    
    if (searchResults.length === 0) {
        searchContainer.innerHTML = '<div style="padding: 10px; text-align: center; color: #666;">No users found</div>';
        return;
    }
    
    searchResults.forEach(user => {
        // Don't show the current user in search results
        if (!currentUser || String(user.user_id) === String(currentUser.user_id)) {
            console.log('Skipping current user:', user.username);
            return;
        }
        
        // Additional check to prevent self-addition by comparing usernames and emails
        if (currentUser.username && user.username === currentUser.username) {
            console.log('Skipping user with same username:', user.username);
            return;
        }
        
        if (currentUser.email && user.email === currentUser.email) {
            console.log('Skipping user with same email:', user.email);
            return;
        }
        
        // Don't show users who are already friends
        const isAlreadyFriend = friends.some(friend => String(friend.user_id) === String(user.user_id));
        if (isAlreadyFriend) {
            console.log('Skipping already friend:', user.username);
            return;
        }
        
        // Don't show users to whom we've already sent friend requests
        const hasPendingRequest = sentRequests.some(request => String(request.to_user_id) === String(user.user_id));
        if (hasPendingRequest) {
            console.log('Skipping user with pending request:', user.username);
            return;
        }
        
        const userItem = document.createElement('div');
        userItem.style.padding = '10px';
        userItem.style.borderBottom = '1px solid #eee';
        userItem.style.cursor = 'pointer';
        userItem.style.display = 'flex';
        userItem.style.justifyContent = 'space-between';
        userItem.style.alignItems = 'center';
        
        userItem.innerHTML = `
            <div>
                <strong>${user.username}</strong>
                <div style="font-size: 12px; color: #666;">${user.email}</div>
            </div>
            <button onclick="sendFriendRequestToUser('${user.user_id}')" style="background: var(--primary-color); color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">
                Add Friend
            </button>
        `;
        
        searchContainer.appendChild(userItem);
    });
}

function clearFriendSearch() {
    const searchContainer = document.getElementById('searchResults');
    if (searchContainer) {
        searchContainer.innerHTML = '';
    }
    searchResults = [];
}

async function sendFriendRequestToUser(toUserId) {
    try {
        // Prevent sending friend request to yourself
        if (!currentUser || String(toUserId) === String(currentUser.user_id)) {
            showError('Cannot send friend request to yourself!');
            return;
        }
        
        await sendFriendRequest(currentUser.user_id, toUserId);
        showSuccess('Friend request sent successfully!');
        
        // Refresh the data to update the UI
        await loadFriends();
        
        // Refresh search results to remove the user from the list
        if (searchResults.length > 0) {
            displaySearchResults();
        }
        
        closeAddFriendModal();
    } catch (error) {
        console.error('Error sending friend request:', error);
        
        // Handle specific error messages
        if (error.message && error.message.includes('already sent')) {
            showError('Friend request already sent to this user!');
        } else if (error.message && error.message.includes('already friends')) {
            showError('You are already friends with this user!');
        } else if (error.message && error.message.includes('not found')) {
            showError('User not found!');
        } else {
            showError('Failed to send friend request. Please try again.');
        }
    }
}

// Legacy add friend function (for demo purposes)
async function addFriend() {
    const name = document.getElementById('friendName').value.trim();
    
    if (!name) {
        showError('Please enter a username or select a user from search results');
        return;
    }
    
    // If there are search results, try to find exact match
    const exactMatch = searchResults.find(user => 
        user.username.toLowerCase() === name.toLowerCase() || 
        user.email.toLowerCase() === name.toLowerCase()
    );
    
    if (exactMatch) {
        await sendFriendRequestToUser(exactMatch.user_id);
    } else {
        showError('User not found. Please select from search results.');
    }
}

// Handle friend requests (for future implementation)
async function loadFriendRequests() {
    try {
        if (!currentUser) return;
        friendRequests = await getPendingRequests(currentUser.user_id);
        renderFriendRequests();
    } catch (error) {
        console.error('Error loading friend requests:', error);
    }
}

function renderFriendRequests() {
    const requestsList = document.getElementById('friendRequestsList');
    const requestCount = document.getElementById('requestCount');
    const requestsSection = document.getElementById('friendRequestsSection');
    
    if (!requestsList || !requestCount || !requestsSection) return;
    
    requestCount.textContent = friendRequests.length;
    
    // Hide section if no requests
    if (friendRequests.length === 0) {
        requestsSection.style.display = 'none';
        return;
    }
    
    requestsSection.style.display = 'block';
    requestsList.innerHTML = '';
    
    friendRequests.forEach(request => {
        const requestItem = document.createElement('div');
        requestItem.className = 'friend-request-item';
        requestItem.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            margin-bottom: 10px;
            border-left: 4px solid var(--primary-color);
        `;
        
        // Handle different possible field names for request ID
        const requestId = request.request_id || request.friendship_id || request.id;
        
        // Create profile picture element for request
        const avatarElement = request.profile_picture_url 
            ? `<div class="friend-avatar" style="margin-right: 15px; background-image: url('${request.profile_picture_url}'); background-size: cover; background-position: center;"></div>`
            : `<div class="friend-avatar" style="margin-right: 15px;">${request.username.charAt(0).toUpperCase()}</div>`;
        
        requestItem.innerHTML = `
            <div style="display: flex; align-items: center;">
                ${avatarElement}
                <div>
                    <strong>${request.username}</strong>
                    <div style="font-size: 12px; color: #666;">${request.email}</div>
                    <div style="font-size: 12px; color: #999;">Sent: ${formatTimeAgo(request.created_at)}</div>
                    <div style="font-size: 10px; color: #ccc;">ID: ${requestId}</div>
                </div>
            </div>
            <div style="display: flex; gap: 10px;">
                <button onclick="acceptFriendRequestById('${requestId}')" 
                        style="background: var(--primary-color); color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">
                    Accept
                </button>
                <button onclick="rejectFriendRequestById('${requestId}')" 
                        style="background: var(--danger-color); color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">
                    Reject
                </button>
            </div>
        `;
        
        requestsList.appendChild(requestItem);
    });
}

async function rejectFriendRequestById(requestId) {
    try {
        await rejectFriendRequest(requestId);
        showSuccess('Friend request rejected!');
        await loadFriends(); // Refresh both friends and requests lists
    } catch (error) {
        console.error('Error rejecting friend request:', error);
        showError('Failed to reject friend request');
    }
}

async function acceptFriendRequestById(requestId) {
    try {
        await acceptFriendRequest(requestId);
        showSuccess('Friend request accepted!');
        await loadFriends(); // Refresh both friends and requests lists
    } catch (error) {
        console.error('Error accepting friend request:', error);
        showError('Failed to accept friend request');
    }
}

// Remove friend functionality
async function removeFriend(friendId) {
    if (!confirm('Are you sure you want to remove this friend?')) {
        return;
    }
    
    try {
        const baseURL = 'http://localhost:3000';
        const response = await fetch(`${baseURL}/api/friends/${currentUser.user_id}/${friendId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to remove friend');
        }
        
        showSuccess('Friend removed successfully!');
        await loadFriends(); // Refresh friends list
    } catch (error) {
        console.error('Error removing friend:', error);
        showError('Failed to remove friend');
    }
}

// Initialize friends functionality
document.addEventListener('DOMContentLoaded', function() {
    setupFriendSearch();
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const addFriendModal = document.getElementById('addFriendModal');
        const friendProfileModal = document.getElementById('friendProfileModal');
        
        if (event.target === addFriendModal) {
            closeAddFriendModal();
        }
        
        if (event.target === friendProfileModal) {
            closeFriendProfileModal();
        }
    });
});

// Friend Profile Modal Functions
let currentFriendId = null;

function openFriendProfileModal() {
    const modal = document.getElementById('friendProfileModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeFriendProfileModal() {
    const modal = document.getElementById('friendProfileModal');
    if (modal) {
        modal.style.display = 'none';
        currentFriendId = null;
    }
}

function populateFriendModal(friendProfile) {
    currentFriendId = friendProfile.user_id;
    
    // Update basic info
    document.getElementById('friendUsername').textContent = friendProfile.username || 'Unknown User';
    document.getElementById('friendCurrentStatus').textContent = 'Available';
    
    // Update profile picture (first letter of username)
    const profilePic = document.getElementById('friendProfilePic');
    if (friendProfile.profile_picture_url) {
        profilePic.style.backgroundImage = `url(${friendProfile.profile_picture_url})`;
        profilePic.style.backgroundSize = 'cover';
        profilePic.style.backgroundPosition = 'center';
        profilePic.textContent = '';
    } else {
        profilePic.textContent = (friendProfile.username || 'U').charAt(0).toUpperCase();
        profilePic.style.backgroundImage = 'none';
    }
    
    // Update Personal Information
    document.getElementById('friendFullName').textContent = 
        (friendProfile.first_name && friendProfile.last_name) 
            ? `${friendProfile.first_name} ${friendProfile.last_name}` 
            : 'Not set';
    document.getElementById('friendAge').textContent = friendProfile.age || 'Not set';
    document.getElementById('friendPhoneNumber').textContent = friendProfile.phone_number || 'Not set';
    document.getElementById('friendAddress').textContent = friendProfile.address || 'Not set';
    
    // Update Health Information
    document.getElementById('friendEmergencyContact').textContent = friendProfile.emergency_contact || 'Not set';
    document.getElementById('friendMedicalNotes').textContent = friendProfile.medical_notes || 'Not set';
    document.getElementById('friendAllergies').textContent = friendProfile.allergies || 'Not set';
    
    // Update status indicator
    const statusDot = document.getElementById('friendStatusDot');
    statusDot.style.background = 'var(--success-color)';
}

function messageFriend() {
    if (currentFriendId) {
        // For now, show a placeholder message
        // In a real app, this would open a messaging interface
        showSuccess('Messaging feature coming soon!');
    }
}

function removeFriendFromModal() {
    if (currentFriendId) {
        if (confirm('Are you sure you want to remove this friend?')) {
            removeFriend(currentFriendId);
            closeFriendProfileModal();
        }
    }
}

// Additional functions for the friends page

async function getFriendCount(userId) {
    try {
        return await apiRequest(`/friends/${userId}/count`);
    } catch (error) {
        console.error('Error fetching friend count:', error);
        return { count: 0 };
    }
}

async function removeFriend(userId, friendId) {
    try {
        return await apiRequest(`/friends/${userId}/${friendId}`, {
            method: 'DELETE'
        });
    } catch (error) {
        console.error('Error removing friend:', error);
        throw error;
    }
}

// ===========================================
// FRIENDS PAGE FUNCTIONALITY
// ===========================================

// Global variables for friends page
let currentUser = null;
let currentAction = null;
let actionData = null;

// Initialize friends page
function initializeFriendsPage() {
    console.log('Friends page loaded');
    
    // Check if user is logged in - try both storage methods
    currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    
    // If not found as object, try individual items
    if (!currentUser) {
        const user_id = localStorage.getItem('user_id');
        const username = localStorage.getItem('username');
        const email = localStorage.getItem('email');
        
        if (user_id && username && email) {
            currentUser = {
                user_id: parseInt(user_id),
                username: username,
                email: email
            };
            console.log('Built currentUser from individual localStorage items:', currentUser);
        }
    }
    
    console.log('Current user:', currentUser);
    
    if (!currentUser) {
        console.log('No user found, redirecting to signin');
        window.location.href = 'signin.html';
        return;
    }

    console.log('User found, proceeding with initialization...');
    console.log('User ID:', currentUser.user_id);
    console.log('Username:', currentUser.username);
    console.log('Email:', currentUser.email);

    // Make currentUser available globally
    window.currentUser = currentUser;

    console.log('User found:', currentUser.username);
    // Update welcome message
    const welcomeElement = document.getElementById('welcome-user');
    if (welcomeElement) {
        welcomeElement.textContent = `Welcome, ${currentUser.username}!`;
    }
    
    // Update time display
    updateTimeDisplay();
    setInterval(updateTimeDisplay, 1000);

    // Load initial data
    console.log('Loading initial friends page data...');
    loadFriendsPage();
    loadPendingRequestsPage();
    loadSentRequestsPage();
    updateFriendCountPage();

    // Initialize default tab if not already set
    const activeTab = document.querySelector('.tab-pane.active');
    if (!activeTab) {
        console.log('No active tab found, setting friends tab as default');
        showTab('friends');
    }

    // Mobile navigation
    const mobileToggle = document.getElementById('mobile-nav-toggle');
    const navDropdown = document.getElementById('nav-dropdown');
    
    if (mobileToggle && navDropdown) {
        mobileToggle.addEventListener('click', function() {
            navDropdown.classList.toggle('show');
        });
    }

    // Modal close functionality
    const modal = document.getElementById('confirmation-modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    }
}

function updateTimeDisplay() {
    const now = new Date();
    const timeOptions = { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    };
    const dateOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    
    const timeElement = document.getElementById('current-time');
    const dateElement = document.getElementById('current-date');
    
    if (timeElement) {
        timeElement.textContent = now.toLocaleTimeString('en-US', timeOptions);
    }
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('en-US', dateOptions);
    }
}

function showTab(tabName) {
    console.log('Switching to tab:', tabName);
    
    // Remove active class from all tabs (support both modern and legacy)
    document.querySelectorAll('.tab-btn, .modern-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane, .modern-tab-pane').forEach(pane => pane.classList.remove('active'));

    // Add active class to selected tab
    const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
    const tabPane = document.getElementById(`${tabName}-tab`);
    
    if (tabButton) tabButton.classList.add('active');
    if (tabPane) tabPane.classList.add('active');
    
    // Load appropriate data based on tab
    switch(tabName) {
        case 'friends':
            loadFriendsPage();
            break;
        case 'pending':
            loadPendingRequestsPage();
            break;
        case 'sent':
            loadSentRequestsPage();
            break;
    }
}

// Modern interface functions
function showQuickAdd() {
    const panel = document.getElementById('quick-search-panel');
    if (panel) {
        panel.style.display = 'block';
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.focus();
        }
    }
}

function hideQuickAdd() {
    const panel = document.getElementById('quick-search-panel');
    if (panel) {
        panel.style.display = 'none';
        const searchResults = document.getElementById('search-results');
        if (searchResults) {
            searchResults.innerHTML = '';
        }
    }
}

async function searchUsersPage() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) {
        console.error('Search input not found');
        return;
    }
    
    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        showMessagePage('Please enter a search term', 'warning');
        return;
    }

    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) {
        console.error('Search results container not found');
        return;
    }
    
    resultsContainer.innerHTML = '<div class="loading">Searching...</div>';

    try {
        console.log('Searching for users with term:', searchTerm);
        const response = await fetch(`http://localhost:3000/api/users/search?q=${encodeURIComponent(searchTerm)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const users = await response.json();
        console.log('Search results:', users);

        if (users.length === 0) {
            resultsContainer.innerHTML = '<div class="empty-state"><p>No users found matching your search</p></div>';
            return;
        }

        // Filter out current user from results
        const filteredUsers = users.filter(user => user.user_id !== currentUser.user_id);
        
        if (filteredUsers.length === 0) {
            resultsContainer.innerHTML = '<div class="empty-state"><p>No other users found matching your search</p></div>';
            return;
        }

        resultsContainer.innerHTML = filteredUsers.map(user => `
            <div class="user-card">
                <div class="user-info">
                    <img src="${user.profile_picture_url || '../pages/images/default-avatar.svg'}" alt="${user.username}" class="user-avatar" onerror="this.src='../pages/images/default-avatar.svg'">
                    <div class="user-details">
                        <h4>${user.username}</h4>
                        <p>${user.first_name ? user.first_name + ' ' + (user.last_name || '') : user.email}</p>
                        ${user.age ? `<small>Age: ${user.age}</small>` : ''}
                    </div>
                </div>
                <button class="btn btn-primary" onclick="sendFriendRequestToUserPage(${user.user_id}, '${user.username}')">
                    Add Friend
                </button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error searching users:', error);
        resultsContainer.innerHTML = '<div class="empty-state"><p>Error searching users. Please try again.</p></div>';
        showMessagePage('Error searching users: ' + error.message, 'error');
    }
}

async function sendFriendRequestToUserPage(toUserId, username) {
    // Show confirmation modal before sending friend request
    showConfirmModalPage(
        'Send Friend Request',
        `Are you sure you want to send a friend request to ${username}?`,
        async () => {
            try {
                const response = await fetch('http://localhost:3000/api/friends/request', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        fromUserId: currentUser.user_id, 
                        toUserId: toUserId 
                    })
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to send friend request');
                }
                
                showMessagePage(`Friend request sent to ${username}!`, 'success');
                loadSentRequestsPage(); // Refresh sent requests
                closeModal();
            } catch (error) {
                console.error('Error sending friend request:', error);
                showMessagePage(error.message || 'Failed to send friend request', 'error');
                closeModal();
            }
        }
    );
}

async function loadFriendsPage() {
    console.log('Loading friends for user:', currentUser ? currentUser.user_id : 'No user');
    
    if (!currentUser) {
        console.error('Cannot load friends: currentUser is null');
        return;
    }
    
    const friendsList = document.getElementById('friends-list');
    const loading = document.getElementById('friends-loading');
    const empty = document.getElementById('friends-empty');

    if (!friendsList || !loading || !empty) return;

    try {
        const url = `http://localhost:3000/api/friends/${currentUser.user_id}`;
        console.log('Fetching friends from:', url);
        
        const response = await fetch(url);
        console.log('Friends response status:', response.status);
        console.log('Friends response headers:', response.headers);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const friends = await response.json();
        console.log('Friends data received:', friends);
        console.log('Friends data type:', typeof friends);
        console.log('Friends array length:', friends ? friends.length : 'null');
        
        loading.style.display = 'none';

        if (!friends || friends.length === 0) {
            console.log('No friends found, showing empty state');
            empty.style.display = 'block';
            empty.innerHTML = `
                <div class="empty-icon">👥</div>
                <h3>No friends yet</h3>
                <p>Start building your network by adding friends!</p>
                <button class="empty-action-btn" onclick="showQuickAdd()">
                    <i class="btn-icon">➕</i>
                    Find Friends
                </button>
            `;
            return;
        }

        console.log('Rendering', friends.length, 'friends');
        friendsList.innerHTML = friends.map(friend => `
            <div class="friend-card">
                <div class="friend-info">
                    <img src="${friend.profile_picture_url || '../pages/images/default-avatar.svg'}" alt="${friend.username}" class="friend-avatar" onerror="this.src='../pages/images/default-avatar.svg'">
                    <div class="friend-details">
                        <h4>${friend.username}</h4>
                        <p>${friend.email}</p>
                        <small>Friends since ${new Date(friend.created_at).toLocaleDateString()}</small>
                    </div>
                </div>
                <div class="friend-actions">
                    <button class="btn btn-secondary" onclick="viewProfilePage(${friend.user_id})">View Profile</button>
                    <button class="btn btn-danger" onclick="removeFriendConfirmPage(${friend.user_id}, '${friend.username}')">Remove</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading friends:', error);
        loading.style.display = 'none';
        loading.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        showMessagePage('Failed to load friends: ' + error.message, 'error');
    }
}

async function loadPendingRequestsPage() {
    console.log('Loading pending requests for user:', currentUser ? currentUser.user_id : 'No user');
    
    if (!currentUser) {
        console.error('Cannot load pending requests: currentUser is null');
        return;
    }
    
    const pendingList = document.getElementById('pending-requests');
    const loading = document.getElementById('pending-loading');
    const empty = document.getElementById('pending-empty');

    if (!pendingList || !loading || !empty) return;

    try {
        const url = `http://localhost:3000/api/friends/${currentUser.user_id}/pending`;
        console.log('Fetching pending requests from:', url);
        
        const response = await fetch(url);
        console.log('Pending requests response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const requests = await response.json();
        console.log('Pending requests data received:', requests);
        console.log('Sample request structure:', requests[0]);
        
        loading.style.display = 'none';

        // Update badge
        const badge = document.getElementById('pending-badge');
        const pendingCount = document.getElementById('pending-count');
        
        if (requests.length > 0) {
            if (badge) {
                badge.textContent = requests.length;
                badge.style.display = 'inline';
            }
        } else {
            if (badge) badge.style.display = 'none';
        }

        if (pendingCount) {
            pendingCount.textContent = requests.length;
        }

        if (requests.length === 0) {
            console.log('No pending requests found');
            empty.style.display = 'block';
            empty.innerHTML = `
                <div class="empty-icon">📨</div>
                <h3>No pending requests</h3>
                <p>When someone sends you a friend request, it will appear here.</p>
            `;
            return;
        }

        console.log('Generating HTML for', requests.length, 'pending requests');
        const htmlContent = requests.map(request => {
            console.log('Processing request:', request.username, 'with ID:', request.friendship_id);
            return `
            <div class="request-card">
                <div class="request-info">
                    <img src="${request.profile_picture_url || '../pages/images/default-avatar.svg'}" alt="${request.username}" class="request-avatar" onerror="this.src='../pages/images/default-avatar.svg'">
                    <div class="request-details">
                        <h4>${request.username}</h4>
                        <p>${request.email}</p>
                        <small>Sent ${new Date(request.created_at).toLocaleDateString()}</small>
                    </div>
                </div>
                <div class="request-actions">
                    <button class="btn btn-success" onclick="acceptRequestPage(${request.friendship_id})">Accept</button>
                    <button class="btn btn-danger" onclick="rejectRequestPage(${request.friendship_id})">Reject</button>
                </div>
            </div>
        `;
        }).join('');
        
        console.log('Generated HTML length:', htmlContent.length);
        console.log('First 500 chars of HTML:', htmlContent.substring(0, 500));
        
        pendingList.innerHTML = htmlContent;
    } catch (error) {
        console.error('Error loading pending requests:', error);
        loading.style.display = 'none';
        loading.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        showMessagePage('Failed to load pending requests: ' + error.message, 'error');
    }
}

async function loadSentRequestsPage() {
    const sentList = document.getElementById('sent-requests');
    const loading = document.getElementById('sent-loading');
    const empty = document.getElementById('sent-empty');

    if (!sentList || !loading || !empty) return;

    try {
        const response = await fetch(`http://localhost:3000/api/friends/${currentUser.user_id}/sent`);
        const requests = await response.json();
        
        loading.style.display = 'none';

        if (requests.length === 0) {
            empty.style.display = 'block';
            return;
        }

        sentList.innerHTML = requests.map(request => `
            <div class="request-card">
                <div class="request-info">
                    <img src="${request.profile_picture_url || '../pages/images/default-avatar.svg'}" alt="${request.username}" class="request-avatar" onerror="this.src='../pages/images/default-avatar.svg'">
                    <div class="request-details">
                        <h4>${request.username}</h4>
                        <p>${request.email}</p>
                        <small>Sent ${new Date(request.created_at).toLocaleDateString()}</small>
                    </div>
                </div>
                <div class="request-status">
                    <span class="status-badge pending">Pending</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        loading.style.display = 'none';
        showMessagePage('Failed to load sent requests', 'error');
    }
}

async function acceptRequestPage(requestId) {
    // Show confirmation modal before accepting
    showConfirmModalPage(
        'Accept Friend Request',
        'Are you sure you want to accept this friend request?',
        async () => {
            try {
                const response = await fetch(`http://localhost:3000/api/friends/accept/${requestId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ userId: currentUser.user_id })
                });
                
                if (!response.ok) {
                    throw new Error('Failed to accept request');
                }
                
                showMessagePage('Friend request accepted!', 'success');
                loadPendingRequestsPage();
                loadFriendsPage();
                updateFriendCountPage();
                closeModal();
            } catch (error) {
                console.error('Error accepting friend request:', error);
                showMessagePage('Failed to accept request', 'error');
                closeModal();
            }
        }
    );
}

async function rejectRequestPage(requestId) {
    // Show confirmation modal before rejecting
    showConfirmModalPage(
        'Reject Friend Request',
        'Are you sure you want to reject this friend request?',
        async () => {
            try {
                const response = await fetch(`http://localhost:3000/api/friends/reject/${requestId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ userId: currentUser.user_id })
                });
                
                if (!response.ok) {
                    throw new Error('Failed to reject request');
                }
                
                showMessagePage('Friend request rejected', 'info');
                loadPendingRequestsPage();
                closeModal();
            } catch (error) {
                console.error('Error rejecting friend request:', error);
                showMessagePage('Failed to reject request', 'error');
                closeModal();
            }
        }
    );
}

function removeFriendConfirmPage(friendId, username) {
    showConfirmModalPage(
        'Remove Friend',
        `Are you sure you want to remove ${username} from your friends?`,
        () => removeFriendActionPage(friendId)
    );
}

async function removeFriendActionPage(friendId) {
    try {
        const response = await fetch(`http://localhost:3000/api/friends/${currentUser.user_id}/${friendId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to remove friend');
        }
        
        showMessagePage('Friend removed', 'info');
        loadFriendsPage();
        updateFriendCountPage();
    } catch (error) {
        showMessagePage('Failed to remove friend', 'error');
    }
}

async function updateFriendCountPage() {
    try {
        const response = await fetch(`http://localhost:3000/api/friends/${currentUser.user_id}/count`);
        const data = await response.json();
        const countElement = document.getElementById('friend-count');
        if (countElement) {
            countElement.textContent = data.count || 0;
        }
    } catch (error) {
        console.error('Failed to get friend count:', error);
    }
}

function viewProfilePage(userId) {
    // Use the existing viewFriendProfile function to show modal
    viewFriendProfile(userId);
}

function showConfirmModalPage(title, message, onConfirm) {
    const modal = document.getElementById('confirmation-modal');
    const titleElement = document.getElementById('modal-title');
    const messageElement = document.getElementById('modal-message');
    
    if (titleElement) titleElement.textContent = title;
    if (messageElement) messageElement.textContent = message;
    
    currentAction = onConfirm;
    
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeModal() {
    const modal = document.getElementById('confirmation-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentAction = null;
}

function confirmAction() {
    if (currentAction) {
        currentAction();
    }
    closeModal();
}

function showMessagePage(message, type = 'info') {
    const container = document.getElementById('message-container');
    if (!container) return;
    
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;
    
    container.appendChild(messageEl);
    
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.remove();
        }
    }, 5000);
}

function showError(message) {
    showMessagePage(message, 'error');
}

function showSuccess(message) {
    showMessagePage(message, 'success');
}

function logoutPage() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    localStorage.removeItem('auth_token');
    window.location.href = 'signin.html';
}

// Alias for HTML compatibility
function logout() {
    logoutPage();
}

// Global functions for backwards compatibility
window.searchUsers = searchUsersPage;
window.sendFriendRequestToUser = sendFriendRequestToUserPage;
window.loadFriends = loadFriendsPage;
window.loadPendingRequests = loadPendingRequestsPage;
window.loadSentRequests = loadSentRequestsPage;
window.acceptRequest = acceptRequestPage;
window.rejectRequest = rejectRequestPage;
window.removeFriendConfirm = removeFriendConfirmPage;
window.removeFriendAction = removeFriendActionPage;
window.updateFriendCount = updateFriendCountPage;
window.viewProfile = viewProfilePage;
window.showConfirmModal = showConfirmModalPage;
window.closeModal = closeModal;
window.confirmAction = confirmAction;
window.showMessage = showMessagePage;
window.logout = logoutPage;
window.showTab = showTab;
window.showQuickAdd = showQuickAdd;
window.hideQuickAdd = hideQuickAdd;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - checking page');
    console.log('Current URL:', window.location.href);
    console.log('Path includes friends:', window.location.pathname.includes('friends'));
    console.log('Has friends container:', !!document.getElementById('friends-container'));
    
    // Only initialize friends page functionality if we're on the friends page
    if (window.location.pathname.includes('friends.html') || 
        window.location.pathname.includes('friends') ||
        document.getElementById('friends-container')) {
        console.log('Initializing friends page...');
        initializeFriendsPage();
    } else {
        console.log('Not on friends page, skipping initialization');
    }
});
