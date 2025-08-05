const chatModel = require('../Model/chatModel');

const chatController = {
    // Send a new message
    async sendMessage(req, res) {
        try {
            const { userId } = req.user; // Assuming user is authenticated and user info is in req.user
            const { message } = req.body;
            
            if (!message || message.trim() === '') {
                return res.status(400).json({ error: 'Message cannot be empty' });
            }
            
            const messageId = await chatModel.saveMessage(
                userId,
                req.user.username, // Assuming username is available in req.user
                message
            );
            
            // Emit the new message to all connected clients
            if (req.app.get('io')) {
                req.app.get('io').emit('newMessage', {
                    message_id: messageId,
                    user_id: userId,
                    username: req.user.username,
                    message_text: message,
                    created_at: new Date()
                });
            }
            
            res.status(201).json({ 
                success: true, 
                message: 'Message sent successfully',
                messageId
            });
            
        } catch (error) {
            console.error('Error sending message:', error);
            res.status(500).json({ error: 'Failed to send message' });
        }
    },
    
    // Get recent messages
    async getMessages(req, res) {
        try {
            const messages = await chatModel.getRecentMessages();
            res.json({ messages });
        } catch (error) {
            console.error('Error fetching messages:', error);
            res.status(500).json({ error: 'Failed to fetch messages' });
        }
    },
    
    // Get new messages since last message ID
    async getNewMessages(req, res) {
        try {
            const lastMessageId = parseInt(req.query.lastMessageId) || 0;
            const messages = await chatModel.getNewMessages(lastMessageId);
            res.json({ messages });
        } catch (error) {
            console.error('Error fetching new messages:', error);
            res.status(500).json({ error: 'Failed to fetch new messages' });
        }
    }
};

module.exports = chatController;
