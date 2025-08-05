document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');
    const messagesContainer = document.getElementById('messages');
    const typingIndicator = document.getElementById('typingIndicator');
    
    // Get current user info from session or localStorage
    const currentUser = JSON.parse(localStorage.getItem('user')) || { 
        userId: 'anonymous', 
        username: 'Guest' 
    };
    
    // Connect to Socket.IO server
    const socket = io();
    let isTyping = false;
    let lastTypingTime;\n    
    // Load previous messages
    async function loadMessages() {
        try {
            const response = await fetch('/api/chat/messages');
            const data = await response.json();
            
            if (data.messages && data.messages.length > 0) {
                // Clear existing messages
                messagesContainer.innerHTML = '';
                
                // Display messages
                data.messages.reverse().forEach(message => {
                    appendMessage(message);
                });
                
                // Scroll to bottom
                scrollToBottom();
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }
    
    // Append a new message to the chat
    function appendMessage(message) {
        const messageElement = document.createElement('div');
        const messageClass = message.user_id === currentUser.userId ? 'sent' : 'received';
        
        const formattedTime = new Date(message.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageElement.className = `message ${messageClass}`;
        messageElement.innerHTML = `
            <div class="message-header">${message.username}</div>
            <div class="message-text">${escapeHtml(message.message_text)}</div>
            <div class="message-time">${formattedTime}</div>
        `;
        
        messagesContainer.insertBefore(messageElement, typingIndicator);
    }
    
    // Scroll to the bottom of the messages
    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Send a new message
    async function sendMessage(messageText) {
        try {
            const response = await fetch('/api/chat/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: messageText }),
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to send message');
            }
            
            // Clear input
            messageInput.value = '';
            
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        }
    }
    
    // Socket.IO event listeners
    socket.on('connect', () => {
        console.log('Connected to chat server');
        // Load messages when connected
        loadMessages();
    });
    
    socket.on('newMessage', (message) => {
        appendMessage(message);
        scrollToBottom();
    });
    
    socket.on('typing', (data) => {
        if (data.userId !== currentUser.userId) {
            typingIndicator.style.display = 'block';
            typingIndicator.setAttribute('data-user', data.username);
            
            // Hide typing indicator after 2 seconds of no typing
            clearTimeout(lastTypingTime);
            lastTypingTime = setTimeout(() => {
                typingIndicator.style.display = 'none';
            }, 2000);
        }
    });
    
    // Event Listeners
    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const messageText = messageInput.value.trim();
        
        if (messageText) {
            sendMessage(messageText);
        }
    });
    
    // Typing indicator
    messageInput.addEventListener('input', () => {
        if (!isTyping) {
            isTyping = true;
            socket.emit('typing', {
                userId: currentUser.userId,
                username: currentUser.username
            });
        }
        
        // Reset typing flag after 1 second of no typing
        clearTimeout(typingTimeout);
        const typingTimeout = setTimeout(() => {
            isTyping = false;
        }, 1000);
    });
    
    // Helper function to escape HTML
    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    // Initial scroll to bottom
    scrollToBottom();
});
