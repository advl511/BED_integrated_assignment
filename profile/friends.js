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
        modal.style.display = 'block';
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
        const response = await fetch(`http://localhost:3000/api/friends/${currentUser.user_id}/${friendId}`, {
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
        modal.style.display = 'block';
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
    
    // Update profile details
    document.getElementById('friendFullName').textContent = 
        (friendProfile.first_name && friendProfile.last_name) 
            ? `${friendProfile.first_name} ${friendProfile.last_name}` 
            : 'Not set';
    
    document.getElementById('friendEmail').textContent = friendProfile.email || 'Not set';
    document.getElementById('friendPhoneNumber').textContent = friendProfile.phone_number || 'Not set';
    document.getElementById('friendAge').textContent = friendProfile.age || 'Not set';
    document.getElementById('friendGender').textContent = friendProfile.gender || 'Not set';
    document.getElementById('friendRace').textContent = friendProfile.race || 'Not set';
    document.getElementById('friendNationality').textContent = friendProfile.nationality || 'Not set';
    
    // Format birthday if available - use date_of_birth first, then birthday
    const birthdayField = friendProfile.date_of_birth || friendProfile.birthday;
    if (birthdayField) {
        const birthday = new Date(birthdayField);
        if (!isNaN(birthday.getTime())) {
            document.getElementById('friendBirthday').textContent = birthday.toLocaleDateString();
        } else {
            document.getElementById('friendBirthday').textContent = 'Not set';
        }
    } else {
        document.getElementById('friendBirthday').textContent = 'Not set';
    }
    
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
