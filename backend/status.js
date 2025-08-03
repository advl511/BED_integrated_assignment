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
        const user = currentUser || window.currentUser;
        if (!user) return;
        
        // Load user's own statuses
        statusUpdates = await getStatuses(user.user_id);
        
        // Load feed from friends
        feedUpdates = await getFeed(user.user_id);
        
        renderStatusUpdates();
    } catch (error) {
        console.error('Error loading statuses:', error);
        showError('Failed to load status updates');
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
            <div style="text-align: center; padding: 40px; color: #666;">
                <h3>No status updates yet</h3>
                <p>Share your first status update or add friends to see their updates!</p>
            </div>
        `;
        return;
    }
    
    allUpdates.forEach(update => {
        const updateItem = document.createElement('div');
        updateItem.className = 'update-item';
        
        const timeAgo = formatTimeAgo(update.created_at);
        const displayName = update.isOwn ? 'You' : (update.username || 'Friend');
        
        updateItem.innerHTML = `
            <div class="update-header">
                <strong>${displayName}</strong>
                <span class="update-time">${timeAgo}</span>
                ${update.isOwn ? `
                    <div style="margin-left: auto;">
                        <button onclick="deleteStatusUpdate('${update.status_id}')" style="background: none; border: none; color: var(--danger-color); cursor: pointer;">Delete</button>
                    </div>
                ` : ''}
            </div>
            <div class="update-content">${update.content}</div>
            ${update.attachments && update.attachments.length > 0 ? renderAttachments(update.attachments) : ''}
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
        <div class="update-attachments" style="margin-top: 15px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
                ${parsedAttachments.map(attachment => {
                    if (attachment.type && attachment.type.startsWith('image/')) {
                        return `
                            <div class="attachment-item" style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                                <img src="${attachment.url}" alt="${attachment.filename}" 
                                     style="width: 100%; height: 250px; object-fit: cover; cursor: pointer;"
                                     onclick="window.open('${attachment.url}', '_blank')">
                                <div style="padding: 8px; font-size: 12px; color: #666;">
                                    📷 ${attachment.filename}
                                </div>
                            </div>
                        `;
                    } else {
                        return `
                            <div class="attachment-item" style="border: 1px solid #ddd; border-radius: 8px; padding: 10px;">
                                <div style="font-size: 14px; margin-bottom: 5px;">
                                    📎 <a href="${attachment.url}" target="_blank" style="color: #007bff; text-decoration: none;">${attachment.filename}</a>
                                </div>
                                <div style="font-size: 12px; color: #666;">
                                    ${attachment.size ? `(${(attachment.size / 1024).toFixed(1)} KB)` : ''}
                                </div>
                            </div>
                        `;
                    }
                }).join('')}
            </div>
        </div>
    `;
}

async function postStatus() {
    console.log('=== POST STATUS CALLED ===');
    
    // Get currentUser from global scope or window
    const user = currentUser || window.currentUser;
    
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
        const user = currentUser || window.currentUser;
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
