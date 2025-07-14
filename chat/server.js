require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    trustServerCertificate: true
  }
};

async function startServer() {
  try {
    await sql.connect(dbConfig);
    console.log('Database connected');
    
    io.on('connection', async (socket) => {
      console.log('a user connected');
      const senderId = 1;
      const receiverId = 2;
      
      // Fetch chat history
      try {
        const request = new sql.Request();
        request.input('senderId', sql.Int, senderId);
        request.input('receiverId', sql.Int, receiverId);
        
        const historyResult = await request.query(`
          SELECT m.message_id, m.sender_id, m.receiver_id, m.message_body, m.sent_at, u.username
          FROM dbo.messages m
          JOIN dbo.users u ON m.sender_id = u.user_id
          WHERE (sender_id = @senderId AND receiver_id = @receiverId)
             OR (sender_id = @receiverId AND receiver_id = @senderId)
          ORDER BY m.sent_at ASC
          OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY
        `);
        
        socket.emit('chat history', historyResult.recordset);
      } catch (err) {
        console.error('DB error fetching chat history:', err);
      }
      
      // Handle new chat messages
      socket.on('chat message', async (msg) => {
        try {
          const request = new sql.Request();
          request.input('senderId', sql.Int, senderId);
          request.input('receiverId', sql.Int, receiverId);
          request.input('messageBody', sql.NVarChar, msg);
          
          // Get sender username
          const userResult = await request.query(`SELECT username FROM dbo.users WHERE user_id = @senderId`);
          const senderUsername = userResult.recordset[0]?.username || 'Unknown';
          
          // Insert message and get the new message ID
          const insertResult = await request.query(`
            INSERT INTO dbo.messages (sender_id, receiver_id, message_body)
            OUTPUT INSERTED.message_id
            VALUES (@senderId, @receiverId, @messageBody)
          `);
          
          const newMessageId = insertResult.recordset[0].message_id;
          
          // Emit the new message with the message_id
          io.emit('chat message', {
            message_id: newMessageId,
            username: senderUsername,
            text: msg
          });
          
        } catch (err) {
          console.error('DB insert error:', err);
        }
      });
      
      // Handle delete message - MOVED OUT of chat message handler
      socket.on('delete message', async (messageId) => {
        console.log('Deleting message ID:', messageId);
        
        // Validate messageId
        const parsedMessageId = parseInt(messageId);
        if (isNaN(parsedMessageId) || parsedMessageId <= 0) {
          console.error('Invalid messageId:', messageId);
          return;
        }
        
        try {
          const request = new sql.Request();
          request.input('messageId', sql.Int, parsedMessageId);
          request.input('senderId', sql.Int, senderId);
          
          const result = await request.query(`
            DELETE FROM dbo.messages
            WHERE message_id = @messageId AND sender_id = @senderId
          `);
          
          if (result.rowsAffected[0] > 0) {
            io.emit('message deleted', parsedMessageId);
            console.log('Message deleted successfully');
          } else {
            console.log('No message found to delete or permission denied');
          }
          
        } catch (err) {
          console.error('DB delete error:', err);
        }
      });
      
      socket.on('disconnect', () => {
        console.log('user disconnected');
      });
    });
    
    http.listen(3000, () => {
      console.log('listening on *:3000');
    });
  } catch (err) {
    console.error('Database connection failed:', err);
  }
}

startServer();





