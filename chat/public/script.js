const socket = io();
const form = document.getElementById('chat-form');
const input = document.getElementById('message-input');
const messages = document.getElementById('messages');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (input.value) {
    socket.emit('chat message', input.value);
    input.value = '';
  }
});

function renderMessage(message) {
  const messageItem = document.createElement('div');
  messageItem.classList.add('message-item');
  messageItem.dataset.id = message.message_id || message.messageId;
  
  const usernameDiv = document.createElement('div');
  usernameDiv.classList.add('message-username');
  usernameDiv.textContent = message.username;
  
  const textDiv = document.createElement('div');
  textDiv.classList.add('message-text');
  textDiv.textContent = message.message_body || message.text;
  
  // Create delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.classList.add('delete-btn');
  
  // Delete button click event
  deleteBtn.addEventListener('click', () => {
    const messageId = messageItem.dataset.id;
    if (messageId && messageId !== 'undefined') {
      socket.emit('delete message', messageId);
    } else {
      console.error('No valid message ID found');
    }
  });
  
  messageItem.appendChild(usernameDiv);
  messageItem.appendChild(textDiv);
  messageItem.appendChild(deleteBtn);
  messages.appendChild(messageItem);
  messages.scrollTop = messages.scrollHeight;
}

// Usage for chat history
socket.on('chat history', (messagesArray) => {
  messagesArray.forEach(renderMessage);
});

// Usage for new message
socket.on('chat message', (data) => {
  renderMessage(data);
});

// Handle message deletion
socket.on('message deleted', (messageId) => {
  const messageElement = document.querySelector(`[data-id="${messageId}"]`);
  if (messageElement) {
    messageElement.remove();
  }
});