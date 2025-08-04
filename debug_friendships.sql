-- Debug script to check friendship data
-- Run this in your database to see if there are any friendship records

-- Check if friendships table exists and has data
SELECT 'Friendships table structure:' as Info;
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'friendships';

SELECT 'All friendship records:' as Info;
SELECT TOP 10 * FROM friendships ORDER BY created_at DESC;

-- Check users table
SELECT 'Recent users:' as Info;
SELECT TOP 5 user_id, username, email, created_at FROM users ORDER BY created_at DESC;

-- Check for pending friend requests
SELECT 'Pending friend requests:' as Info;
SELECT f.friendship_id, f.user_id as requester_id, u1.username as requester_name,
       f.friend_user_id as recipient_id, u2.username as recipient_name,
       f.status, f.created_at
FROM friendships f
JOIN users u1 ON f.user_id = u1.user_id
JOIN users u2 ON f.friend_user_id = u2.user_id
WHERE f.status = 'pending'
ORDER BY f.created_at DESC;

-- If no pending requests exist, create some test data
-- First, make sure we have at least 2 users
IF (SELECT COUNT(*) FROM users) < 2
BEGIN
    PRINT 'Need at least 2 users for friend requests. Creating test users...';
    
    INSERT INTO users (username, email, password_hash, salt, phone_number, race, age, 
                      first_name, last_name, gender, date_of_birth, nationality)
    VALUES 
    ('testuser1', 'test1@example.com', 'dummy_hash', 'dummy_salt', '1234567890', 
     'Asian', 25, 'Test', 'User1', 'Male', '1999-01-01', 'Singapore'),
    ('testuser2', 'test2@example.com', 'dummy_hash', 'dummy_salt', '0987654321', 
     'Chinese', 30, 'Test', 'User2', 'Female', '1994-01-01', 'Singapore');
END

-- Create test friend requests if none exist
IF (SELECT COUNT(*) FROM friendships WHERE status = 'pending') = 0
BEGIN
    PRINT 'No pending friend requests found. Creating test data...';
    
    DECLARE @user1_id INT = (SELECT TOP 1 user_id FROM users ORDER BY user_id);
    DECLARE @user2_id INT = (SELECT TOP 1 user_id FROM users WHERE user_id != @user1_id ORDER BY user_id);
    
    IF @user1_id IS NOT NULL AND @user2_id IS NOT NULL
    BEGIN
        INSERT INTO friendships (user_id, friend_user_id, status)
        VALUES (@user1_id, @user2_id, 'pending');
        
        PRINT 'Created test friend request from user ' + CAST(@user1_id AS VARCHAR) + ' to user ' + CAST(@user2_id AS VARCHAR);
    END
END

-- Show final status
SELECT 'Final check - Pending requests after setup:' as Info;
SELECT f.friendship_id, f.user_id as requester_id, u1.username as requester_name,
       f.friend_user_id as recipient_id, u2.username as recipient_name,
       f.status, f.created_at
FROM friendships f
JOIN users u1 ON f.user_id = u1.user_id
JOIN users u2 ON f.friend_user_id = u2.user_id
WHERE f.status = 'pending'
ORDER BY f.created_at DESC;
