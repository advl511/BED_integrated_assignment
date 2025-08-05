const { query } = require('../Middleware/db');

const chatModel = {
    // Save a new message to the database
    async saveMessage(userId, username, messageText) {
        const sql = `
            INSERT INTO messages (user_id, username, message_text)
            VALUES (@userId, @username, @messageText)
            SELECT SCOPE_IDENTITY() AS messageId;
        `;
        
        const params = {
            userId: { type: sql.Int, value: userId },
            username: { type: sql.NVarChar, value: username },
            messageText: { type: sql.NVarChar, value: messageText }
        };
        
        const result = await query(sql, params);
        return result.recordset[0].messageId;
    },

    // Get recent messages (default to 50 most recent)
    async getRecentMessages(limit = 50) {
        const sql = `
            SELECT TOP (@limit) 
                m.message_id, 
                m.user_id, 
                m.username, 
                m.message_text, 
                m.created_at
            FROM messages m
            ORDER BY m.created_at DESC
        `;
        
        const params = {
            limit: { type: sql.Int, value: limit }
        };
        
        const result = await query(sql, params);
        return result.recordset;
    },

    // Get messages newer than a specific message ID
    async getNewMessages(lastMessageId) {
        const sql = `
            SELECT 
                m.message_id, 
                m.user_id, 
                m.username, 
                m.message_text, 
                m.created_at
            FROM messages m
            WHERE m.message_id > @lastMessageId
            ORDER BY m.created_at ASC
        `;
        
        const params = {
            lastMessageId: { type: sql.Int, value: lastMessageId }
        };
        
        const result = await query(sql, params);
        return result.recordset;
    }
};

module.exports = chatModel;
