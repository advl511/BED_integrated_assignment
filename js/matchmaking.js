// Matchmaking JavaScript functionality
let isInQueue = false;
let matchStatus = 'not_in_queue';
let pollInterval = null;

// DOM elements
const joinQueueBtn = document.getElementById('joinQueueBtn');
const leaveQueueBtn = document.getElementById('leaveQueueBtn');
const statusDisplay = document.getElementById('statusDisplay');
const queueStatus = document.getElementById('queueStatus');

// Initialize matchmaking functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Matchmaking system initialized');
    
    // Check initial status
    checkMatchmakingStatus();
    
    // Set up event listeners
    if (joinQueueBtn) {
        joinQueueBtn.addEventListener('click', joinQueue);
    }
    
    if (leaveQueueBtn) {
        leaveQueueBtn.addEventListener('click', leaveQueue);
    }
});

// Join the matchmaking queue
async function joinQueue() {
    try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            showAlert('Please log in to join matchmaking', 'error');
            return;
        }

        const response = await fetch('/api/matchmaking/join', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.success) {
            if (data.status === 'matched') {
                handleMatchFound(data);
            } else if (data.status === 'waiting') {
                handleQueueJoined();
            }
        } else {
            showAlert(data.message || 'Failed to join queue', 'error');
        }
    } catch (error) {
        console.error('Error joining queue:', error);
        showAlert('Error joining matchmaking queue', 'error');
    }
}

// Leave the matchmaking queue
async function leaveQueue() {
    try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            showAlert('Please log in first', 'error');
            return;
        }

        const response = await fetch('/api/matchmaking/leave', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.success) {
            handleQueueLeft();
        } else {
            showAlert(data.message || 'Failed to leave queue', 'error');
        }
    } catch (error) {
        console.error('Error leaving queue:', error);
        showAlert('Error leaving matchmaking queue', 'error');
    }
}

// Check current matchmaking status
async function checkMatchmakingStatus() {
    try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            updateUI('not_logged_in');
            return;
        }

        const response = await fetch('/api/matchmaking/status', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.success) {
            matchStatus = data.status;
            updateUI(data.status);
        }
    } catch (error) {
        console.error('Error checking status:', error);
        updateUI('error');
    }
}

// Handle successful queue join
function handleQueueJoined() {
    isInQueue = true;
    matchStatus = 'in_queue';
    updateUI('in_queue');
    startPolling();
    showAlert('Successfully joined matchmaking queue!', 'success');
}

// Handle successful queue leave
function handleQueueLeft() {
    isInQueue = false;
    matchStatus = 'not_in_queue';
    updateUI('not_in_queue');
    stopPolling();
    showAlert('Successfully left matchmaking queue', 'success');
}

// Handle match found
function handleMatchFound(data) {
    isInQueue = false;
    matchStatus = 'matched';
    updateUI('matched', data);
    stopPolling();
    showAlert('Match found! Starting game...', 'success');
    
    // Redirect to game or show match details
    setTimeout(() => {
        console.log('Match details:', data);
        // You can redirect to a game page here
        // window.location.href = '/game.html?matchId=' + data.matchId;
    }, 2000);
}

// Update UI based on current status
function updateUI(status, data = null) {
    if (!statusDisplay) return;
    
    switch (status) {
        case 'not_logged_in':
            statusDisplay.textContent = 'Please log in to use matchmaking';
            if (joinQueueBtn) joinQueueBtn.disabled = true;
            if (leaveQueueBtn) leaveQueueBtn.disabled = true;
            break;
            
        case 'not_in_queue':
            statusDisplay.textContent = 'Ready to find a match';
            if (joinQueueBtn) {
                joinQueueBtn.disabled = false;
                joinQueueBtn.style.display = 'block';
            }
            if (leaveQueueBtn) leaveQueueBtn.style.display = 'none';
            break;
            
        case 'in_queue':
            statusDisplay.textContent = 'Searching for opponent...';
            if (joinQueueBtn) joinQueueBtn.style.display = 'none';
            if (leaveQueueBtn) {
                leaveQueueBtn.disabled = false;
                leaveQueueBtn.style.display = 'block';
            }
            break;
            
        case 'matched':
            statusDisplay.textContent = 'Match found! Preparing game...';
            if (joinQueueBtn) joinQueueBtn.style.display = 'none';
            if (leaveQueueBtn) leaveQueueBtn.style.display = 'none';
            break;
            
        case 'error':
            statusDisplay.textContent = 'Error connecting to matchmaking service';
            if (joinQueueBtn) joinQueueBtn.disabled = true;
            if (leaveQueueBtn) leaveQueueBtn.disabled = true;
            break;
    }
}

// Start polling for match updates
function startPolling() {
    if (pollInterval) return;
    
    pollInterval = setInterval(() => {
        checkMatchmakingStatus();
    }, 2000); // Poll every 2 seconds
}

// Stop polling
function stopPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
}

// Show alert function (fallback if not defined elsewhere)
function showAlert(message, type = 'info') {
    // Try to use existing alert system first, but avoid recursion
    if (typeof window.showAlert === 'function' && window.showAlert !== showAlert) {
        window.showAlert(message, type);
        return;
    }
    
    // Fallback to console and basic alert
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 4px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 300px;
        word-wrap: break-word;
        ${type === 'success' ? 'background-color: #10b981;' : ''}
        ${type === 'error' ? 'background-color: #ef4444;' : ''}
        ${type === 'info' ? 'background-color: #3b82f6;' : ''}
    `;
    
    document.body.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 3000);
}

// Export functions for external use
window.matchmaking = {
    joinQueue,
    leaveQueue,
    checkMatchmakingStatus,
    updateUI
};
