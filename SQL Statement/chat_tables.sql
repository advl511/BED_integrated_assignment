-- Create messages table for chat functionality
CREATE TABLE messages (
    message_id INT IDENTITY(1,1) PRIMARY KEY,
    userid INT NOT NULL,
    username NVARCHAR(50) NOT NULL,
    message_text NVARCHAR(1000) NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (userid) REFERENCES users(user_id)
);

-- Create index for better performance when fetching messages
CREATE INDEX idx_messages_created_at ON messages(created_at);
