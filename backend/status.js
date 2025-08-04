// Status management
let statusUpdates = [];
let feedUpdates = [];
let selectedFiles = []; // Store selected files for upload

// Status API functions (moved here to ensure they're always available)
const STATUS_API_BASE_URL = 'http://localhost:3000/api';

async function statusApiRequest(endpoint, options = {}, baseUrl = STATUS_API_BASE_URL) {
    const url = `${baseUrl}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    try {
        console.log('Making API request to:', url);
        console.log('Config:', config);
        
        const response = await fetch(url, config);
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (!response.ok) {
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

async function getStatuses(userId, limit = 10) {
    try {
        return await statusApiRequest(`/statuses/${userId}?limit=${limit}`);
    } catch (error) {
        console.error('Error fetching statuses:', error);
        return [];
    }
}

async function createStatus(userId, content, attachments = []) {
    try {
        return await statusApiRequest('/statuses', {
            method: 'POST',
            body: JSON.stringify({ userId, content, attachments })
        });
    } catch (error) {
        console.error('Error creating status:', error);
        throw error;
    }
}

async function createStatusWithAttachments(userId, content, files = []) {
    try {
        console.log('=== FRONTEND: Creating status with attachments ===');
        console.log('userId:', userId);
        console.log('content:', content);
        console.log('files:', files);
        console.log('files length:', files.length);
        
        const formData = new FormData();
        formData.append('userId', userId);
        formData.append('content', content);
        
        // Add files to form data
        files.forEach((file, index) => {
            console.log(`Adding file ${index}:`, file.name, file.size, file.type);
            formData.append('attachments', file);
        });
        
        console.log('FormData prepared, making request to:', `${STATUS_API_BASE_URL}/statuses/with-attachments`);
        
        const response = await fetch(`${STATUS_API_BASE_URL}/statuses/with-attachments`, {
            method: 'POST',
            body: formData
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (!response.ok) {
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('Error creating status with attachments:', error);
        throw error;
    }
}

async function updateStatus(statusId, content, userId) {
    try {
        return await statusApiRequest(`/statuses/${statusId}`, {
            method: 'PUT',
            body: JSON.stringify({ content, userId })
        });
    } catch (error) {
        console.error('Error updating status:', error);
        throw error;
    }
}

async function deleteStatus(statusId, userId) {
    try {
        return await statusApiRequest(`/statuses/${statusId}`, {
            method: 'DELETE',
            body: JSON.stringify({ userId })
        });
    } catch (error) {
        console.error('Error deleting status:', error);
        throw error;
    }
}

async function getFeed(userId, limit = 20) {
    try {
        return await statusApiRequest(`/feed/${userId}?limit=${limit}`);
    } catch (error) {
        console.error('Error fetching feed:', error);
        return [];
    }
}

async function loadStatuses() {
    try {
        console.log('Starting loadStatuses...');
        
        // Get user from global currentUser or construct from localStorage
        let user = currentUser || window.currentUser;
        
        if (!user) {
            // Try to get user from localStorage
            const userId = localStorage.getItem('user_id');
            const username = localStorage.getItem('username');
            const email = localStorage.getItem('email');
            
            console.log('Getting user from localStorage:', { userId, username, email });
            
            if (userId && username && email) {
                user = {
                    user_id: parseInt(userId),
                    username: username,
                    email: email
                };
                // Set global user for other functions
                window.currentUser = user;
                currentUser = user;
            }
        }
        
        if (!user) {
            console.log('No user found, cannot load statuses');
            return;
        }
        
        console.log('Loading statuses for user:', user);
        
        // Load user's own statuses
        console.log('Fetching user statuses...');
        statusUpdates = await getStatuses(user.user_id);
        console.log('User statuses loaded:', statusUpdates);
        
        // Load feed from friends
        console.log('Fetching feed...');
        feedUpdates = await getFeed(user.user_id);
        console.log('Feed loaded:', feedUpdates);
        
        console.log('Rendering status updates...');
        renderStatusUpdates();
        
    } catch (error) {
        console.error('Error loading statuses:', error);
        showError('Failed to load status updates: ' + error.message);
        // Fallback to empty arrays
        statusUpdates = [];
        feedUpdates = [];
        renderStatusUpdates();
    }
}

function renderStatusUpdates() {
    const statusList = document.getElementById('statusList');
    if (!statusList) return;
    
    statusList.innerHTML = '';
    
    // Combine and sort all updates by timestamp, removing duplicates by status_id
    const combinedUpdates = [
        ...statusUpdates.map(status => ({...status, isOwn: true})),
        ...feedUpdates.map(status => ({...status, isOwn: false}))
    ];
    
    // Remove duplicates based on status_id (keep the one marked as isOwn: true if duplicate)
    const uniqueUpdates = [];
    const seenIds = new Set();
    
    // First pass: add all user's own statuses
    combinedUpdates.forEach(update => {
        if (update.isOwn && !seenIds.has(update.status_id)) {
            uniqueUpdates.push(update);
            seenIds.add(update.status_id);
        }
    });
    
    // Second pass: add friend statuses that aren't duplicates
    combinedUpdates.forEach(update => {
        if (!update.isOwn && !seenIds.has(update.status_id)) {
            uniqueUpdates.push(update);
            seenIds.add(update.status_id);
        }
    });
    
    // Sort by timestamp
    const allUpdates = uniqueUpdates.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    if (allUpdates.length === 0) {
        statusList.innerHTML = `
            <div class="empty-feed">
                <h3>No status updates yet</h3>
                <p>Share your first status update or add friends to see their updates!</p>
            </div>
        `;
        return;
    }
    
    allUpdates.forEach(update => {
        const updateItem = document.createElement('div');
        updateItem.className = `status-item ${update.isOwn ? 'status-own' : ''}`;
        
        const timeAgo = formatTimeAgo(update.created_at);
        const displayName = update.isOwn ? 'You' : (update.username || 'Friend');
        
        updateItem.innerHTML = `
            <div class="status-header-info">
                <span class="status-user">${displayName}</span>
                <span class="status-time">${timeAgo}</span>
            </div>
            <div class="status-content">${update.content}</div>
            ${update.attachments && update.attachments.length > 0 ? renderAttachments(update.attachments) : ''}
            ${update.isOwn ? `
                <div class="status-actions-bar">
                    <button onclick="deleteStatusUpdate('${update.status_id}')" class="delete-status">🗑️ Delete</button>
                </div>
            ` : ''}
        `;
        
        statusList.appendChild(updateItem);
    });
}

function renderAttachments(attachments) {
    if (!attachments || attachments.length === 0) return '';
    
    // Parse attachments if it's a string
    const parsedAttachments = typeof attachments === 'string' 
        ? JSON.parse(attachments) 
        : attachments;
    
    if (!Array.isArray(parsedAttachments) || parsedAttachments.length === 0) return '';
    
    return `
        <div class="status-attachments">
            ${parsedAttachments.map(attachment => {
                if (attachment.type && attachment.type.startsWith('image/')) {
                    return `
                        <img src="${attachment.url}" alt="${attachment.filename}" 
                             class="attachment-preview"
                             onclick="window.open('${attachment.url}', '_blank')">
                    `;
                } else {
                    return `
                        <div class="attachment-item" style="border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; background: var(--secondary-bg);">
                            <div style="font-size: 14px; margin-bottom: 5px;">
                                📎 <a href="${attachment.url}" target="_blank" style="color: var(--accent-color); text-decoration: none;">${attachment.filename}</a>
                            </div>
                            <div style="font-size: 12px; color: var(--text-secondary);">
                                ${attachment.size ? `(${(attachment.size / 1024).toFixed(1)} KB)` : ''}
                            </div>
                        </div>
                    `;
                }
            }).join('')}
        </div>
    `;
}

// Utility function to format time ago
function formatTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
        return 'Just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
        // For older posts, show the actual date
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }
}

async function postStatus() {
    console.log('=== POST STATUS CALLED ===');
    
    // Get currentUser from global scope, window, or localStorage
    let user = currentUser || window.currentUser;
    
    if (!user) {
        // Try to get user from localStorage
        const userId = localStorage.getItem('user_id');
        const username = localStorage.getItem('username');
        const email = localStorage.getItem('email');
        
        if (userId && username && email) {
            user = {
                user_id: parseInt(userId),
                username: username,
                email: email
            };
            // Set global user for other functions
            window.currentUser = user;
            currentUser = user;
        }
    }
    
    console.log('currentUser:', currentUser);
    console.log('window.currentUser:', window.currentUser);
    console.log('user:', user);
    
    const statusInput = document.getElementById('statusInput');
    if (!statusInput || !user) {
        console.log('Missing statusInput or currentUser');
        console.log('statusInput:', statusInput);
        console.log('user:', user);
        showError('Please make sure you are logged in');
        return;
    }
    
    const content = statusInput.value.trim();
    console.log('Content:', content);
    console.log('Selected files:', selectedFiles);
    console.log('Current user:', user);
    
    if (!content) {
        showError('Please enter some content for your status update');
        return;
    }
    
    try {
        // Show loading state
        const postBtn = document.querySelector('.post-btn');
        const originalText = postBtn.textContent;
        postBtn.textContent = 'Posting...';
        postBtn.disabled = true;
        
        let newStatus;
        
        // Check if files are selected
        if (selectedFiles.length > 0) {
            console.log('Creating status with attachments, file count:', selectedFiles.length);
            // Create status with attachments
            newStatus = await createStatusWithAttachments(user.user_id, content, selectedFiles);
        } else {
            console.log('Creating regular status without attachments');
            // Create regular status
            newStatus = await createStatus(user.user_id, content);
        }
        
        console.log('Status created successfully:', newStatus);
        
        // Clear the input and selected files
        statusInput.value = '';
        selectedFiles = [];
        updateSelectedFilesDisplay();
        
        // Reload all statuses to get the latest data from server
        await loadStatuses();
        
        // Update current status display
        updateCurrentStatus(content);
        
        showSuccess('Status posted successfully!');
        
        // Reset button
        postBtn.textContent = originalText;
        postBtn.disabled = false;
        
    } catch (error) {
        console.error('=== POST STATUS ERROR ===');
        console.error('Full error object:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        showError('Failed to post status. Please try again. Error: ' + error.message);
        
        // Reset button on error
        const postBtn = document.querySelector('.post-btn');
        postBtn.textContent = 'Post';
        postBtn.disabled = false;
    }
}

function updateCurrentStatus(content) {
    const currentStatus = document.getElementById('currentStatus');
    if (currentStatus) {
        // Extract first few words for status display
        const shortStatus = content.split(' ').slice(0, 3).join(' ') + (content.split(' ').length > 3 ? '...' : '');
        currentStatus.textContent = shortStatus;
    }
}

async function deleteStatusUpdate(statusId) {
    if (!confirm('Are you sure you want to delete this status update?')) return;
    
    try {
        // Get currentUser from global scope, window, or localStorage
        let user = currentUser || window.currentUser;
        
        if (!user) {
            // Try to get user from localStorage
            const userId = localStorage.getItem('user_id');
            const username = localStorage.getItem('username');
            const email = localStorage.getItem('email');
            
            if (userId && username && email) {
                user = {
                    user_id: parseInt(userId),
                    username: username,
                    email: email
                };
                // Set global user for other functions
                window.currentUser = user;
                currentUser = user;
            }
        }
        
        if (!user) {
            showError('Please make sure you are logged in');
            return;
        }
        
        await deleteStatus(statusId, user.user_id);
        
        // Remove from local array
        statusUpdates = statusUpdates.filter(s => s.status_id !== statusId);
        
        renderStatusUpdates();
        showSuccess('Status deleted successfully!');
        
    } catch (error) {
        console.error('Error deleting status:', error);
        showError('Failed to delete status. Please try again.');
    }
}

function addPhotos() {
    // Create a file input for photos
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,video/*';
    fileInput.multiple = true;
    
    fileInput.addEventListener('change', function(event) {
        const files = Array.from(event.target.files);
        if (files.length > 0) {
            selectedFiles.push(...files);
            updateSelectedFilesDisplay();
            showSuccess(`${files.length} file(s) selected for upload`);
        }
    });
    
    fileInput.click();
}

function updateSelectedFilesDisplay() {
    // Find or create a display area for selected files
    let filesDisplay = document.getElementById('selectedFilesDisplay');
    if (!filesDisplay) {
        filesDisplay = document.createElement('div');
        filesDisplay.id = 'selectedFilesDisplay';
        filesDisplay.style.cssText = `
            margin-top: 10px;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #e9ecef;
        `;
        
        const statusActions = document.querySelector('.status-actions');
        statusActions.parentNode.insertBefore(filesDisplay, statusActions);
    }
    
    if (selectedFiles.length === 0) {
        filesDisplay.innerHTML = '';
        filesDisplay.style.display = 'none';
        return;
    }
    
    filesDisplay.style.display = 'block';
    filesDisplay.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 8px;">Selected Files:</div>
        ${selectedFiles.map((file, index) => `
            <div style="display: flex; align-items: center; margin-bottom: 5px;">
                <span style="flex: 1;">${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
                <button onclick="removeSelectedFile(${index})" style="background: #dc3545; color: white; border: none; border-radius: 4px; padding: 2px 8px; cursor: pointer;">Remove</button>
            </div>
        `).join('')}
        <button onclick="clearSelectedFiles()" style="background: #6c757d; color: white; border: none; border-radius: 4px; padding: 5px 10px; cursor: pointer; margin-top: 5px;">Clear All</button>
    `;
}

function removeSelectedFile(index) {
    selectedFiles.splice(index, 1);
    updateSelectedFilesDisplay();
}

function clearSelectedFiles() {
    selectedFiles = [];
    updateSelectedFilesDisplay();
}

async function handleMediaUpload(files) {
    // This would handle uploading media files
    // For now, just show what would be uploaded
    const fileNames = files.map(f => f.name).join(', ');
    showSuccess(`Selected files: ${fileNames}. Media upload feature will be implemented soon!`);
}

// Auto-refresh statuses every 30 seconds
let statusRefreshInterval;

function startStatusRefresh() {
    // Clear any existing interval
    if (statusRefreshInterval) {
        clearInterval(statusRefreshInterval);
    }
    
    // Refresh every 30 seconds
    statusRefreshInterval = setInterval(async () => {
        try {
            await loadStatuses();
        } catch (error) {
            console.error('Error auto-refreshing statuses:', error);
        }
    }, 30000);
}

function stopStatusRefresh() {
    if (statusRefreshInterval) {
        clearInterval(statusRefreshInterval);
        statusRefreshInterval = null;
    }
}

// Error and success message functions
function showError(message) {
    console.error('Error:', message);
    
    // Try to find message container in status page
    let container = document.getElementById('message-container');
    
    // If not found, try to create one or use existing error display
    if (!container) {
        // Look for status list and add message there
        const statusList = document.getElementById('statusList');
        if (statusList) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.style.cssText = `
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
                padding: 10px;
                border-radius: 4px;
                margin: 10px 0;
                text-align: center;
            `;
            errorDiv.textContent = message;
            
            // Insert at the top of status list
            statusList.insertBefore(errorDiv, statusList.firstChild);
            
            // Remove after 5 seconds
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.remove();
                }
            }, 5000);
            return;
        }
    }
    
    if (container) {
        container.innerHTML = '';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        container.appendChild(errorDiv);
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }
}

function showSuccess(message) {
    console.log('Success:', message);
    
    // Try to find message container in status page
    let container = document.getElementById('message-container');
    
    if (!container) {
        // Look for status list and add message there
        const statusList = document.getElementById('statusList');
        if (statusList) {
            const successDiv = document.createElement('div');
            successDiv.className = 'success-message';
            successDiv.style.cssText = `
                background: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
                padding: 10px;
                border-radius: 4px;
                margin: 10px 0;
                text-align: center;
            `;
            successDiv.textContent = message;
            
            // Insert at the top of status list
            statusList.insertBefore(successDiv, statusList.firstChild);
            
            // Remove after 3 seconds
            setTimeout(() => {
                if (successDiv.parentNode) {
                    successDiv.remove();
                }
            }, 3000);
            return;
        }
    }
    
    if (container) {
        container.innerHTML = '';
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        container.appendChild(successDiv);
        
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 3000);
    }
}

// Handle keyboard shortcuts
document.addEventListener('DOMContentLoaded', function() {
    const statusInput = document.getElementById('statusInput');
    if (statusInput) {
        statusInput.addEventListener('keydown', function(event) {
            // Post status with Ctrl+Enter
            if (event.ctrlKey && event.key === 'Enter') {
                event.preventDefault();
                postStatus();
            }
        });
    }
    
    // Start auto-refresh when page loads
    startStatusRefresh();
});

// Stop auto-refresh when page is hidden
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        stopStatusRefresh();
    } else {
        startStatusRefresh();
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    stopStatusRefresh();
});
