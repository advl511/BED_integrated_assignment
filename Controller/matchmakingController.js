const sql = require('mssql');
const dbConfig = require('../dbConfig');

class MatchmakingController {
    // Join the matchmaking queue
    static async joinQueue(req, res) {
        const userId = req.user.id; // From JWT middleware
        
        try {
            const pool = await sql.connect(dbConfig);
            
            // Check if user is already in queue
            const checkResult = await pool.request()
                .input('userId', sql.Int, userId)
                .query('SELECT * FROM MatchQueue WHERE UserID = @userId AND IsMatched = 0');
            
            if (checkResult.recordset.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'User already in queue',
                    status: 'in_queue',
                    position: checkResult.recordset[0].QueueID,
                    total: await this.getQueueCount(pool)
                });
            }
            
            // Add user to queue
            await pool.request()
                .input('userId', sql.Int, userId)
                .query('INSERT INTO MatchQueue (UserID, JoinTime, IsMatched) VALUES (@userId, GETDATE(), 0)');
            
            // Try to find a match
            const match = await this.tryFindMatch(pool, userId);
            
            if (match) {
                return res.json({
                    success: true,
                    status: 'matched',
                    match: {
                        MatchID: match.MatchID,
                        opponent: match.opponentName
                    }
                });
            }
            
            // No match found, return queue position
            const position = await this.getUserQueuePosition(pool, userId);
            const total = await this.getQueueCount(pool);
            
            res.json({
                success: true,
                status: 'in_queue',
                position: position,
                total: total
            });
            
        } catch (error) {
            console.error('Error joining queue:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
    
    // Leave the matchmaking queue
    static async leaveQueue(req, res) {
        const userId = req.user.id;
        
        try {
            const pool = await sql.connect(dbConfig);
            
            await pool.request()
                .input('userId', sql.Int, userId)
                .query('DELETE FROM MatchQueue WHERE UserID = @userId');
                
            res.json({ success: true, message: 'Left queue successfully' });
            
        } catch (error) {
            console.error('Error leaving queue:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
    
    // Get current queue status for a user
    static async getStatus(req, res) {
        const userId = req.user.id;
        
        try {
            const pool = await sql.connect(dbConfig);
            
            // Check if user is in a match
            const matchResult = await pool.request()
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT m.MatchID, 
                           CASE 
                               WHEN m.User1ID = @userId THEN u2.Username 
                               ELSE u1.Username 
                           END as opponentName
                    FROM Matches m
                    JOIN Users u1 ON m.User1ID = u1.UserID
                    JOIN Users u2 ON m.User2ID = u2.UserID
                    WHERE (m.User1ID = @userId OR m.User2ID = @userId) 
                    AND m.Status = 'active'
                `);
            
            if (matchResult.recordset.length > 0) {
                return res.json({
                    success: true,
                    status: 'matched',
                    match: {
                        MatchID: matchResult.recordset[0].MatchID,
                        opponent: matchResult.recordset[0].opponentName
                    }
                });
            }
            
            // Check if user is in queue
            const queueResult = await pool.request()
                .input('userId', sql.Int, userId)
                .query('SELECT QueueID FROM MatchQueue WHERE UserID = @userId AND IsMatched = 0');
            
            if (queueResult.recordset.length > 0) {
                const position = await this.getUserQueuePosition(pool, userId);
                const total = await this.getQueueCount(pool);
                
                return res.json({
                    success: true,
                    status: 'in_queue',
                    position: position,
                    total: total
                });
            }
            
            // User is not in queue or in a match
            res.json({
                success: true,
                status: 'not_in_queue'
            });
            
        } catch (error) {
            console.error('Error getting queue status:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
    
    // Helper method to try to find a match for a user
    static async tryFindMatch(pool, userId) {
        try {
            // Find another user in the queue
            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT TOP 1 q2.UserID, u.Username as opponentName
                    FROM MatchQueue q1
                    JOIN MatchQueue q2 ON q1.UserID != q2.UserID
                    JOIN Users u ON q2.UserID = u.UserID
                    WHERE q1.UserID = @userId 
                    AND q2.IsMatched = 0
                    AND q2.UserID NOT IN (
                        SELECT User1ID FROM Matches WHERE User2ID = @userId AND Status = 'blocked'
                        UNION
                        SELECT User2ID FROM Matches WHERE User1ID = @userId AND Status = 'blocked'
                    )
                    ORDER BY q2.QueueID
                `);
            
            if (result.recordset.length === 0) {
                return null; // No match found
            }
            
            const opponent = result.recordset[0];
            
            // Create a new match
            const matchResult = await pool.request()
                .input('user1Id', sql.Int, Math.min(userId, opponent.UserID))
                .input('user2Id', sql.Int, Math.max(userId, opponent.UserID))
                .query(`
                    INSERT INTO Matches (User1ID, User2ID, MatchTime, Status)
                    VALUES (@user1Id, @user2Id, GETDATE(), 'active');
                    SELECT SCOPE_IDENTITY() as MatchID;
                `);
            
            const matchId = matchResult.recordset[0].MatchID;
            
            // Mark both users as matched
            await pool.request()
                .input('userId1', sql.Int, userId)
                .input('userId2', sql.Int, opponent.UserID)
                .query('UPDATE MatchQueue SET IsMatched = 1, MatchID = @matchId WHERE UserID IN (@userId1, @userId2)');
            
            return {
                MatchID: matchId,
                opponentName: opponent.opponentName
            };
            
        } catch (error) {
            console.error('Error finding match:', error);
            return null;
        }
    }
    
    // Helper method to get user's position in queue
    static async getUserQueuePosition(pool, userId) {
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT COUNT(*) as position
                FROM MatchQueue
                WHERE QueueID <= (SELECT QueueID FROM MatchQueue WHERE UserID = @userId)
                AND IsMatched = 0
            `);
            
        return result.recordset[0].position;
    }
    
    // Helper method to get total users in queue
    static async getQueueCount(pool) {
        const result = await pool.request()
            .query('SELECT COUNT(*) as count FROM MatchQueue WHERE IsMatched = 0');
            
        return result.recordset[0].count;
    }
}

module.exports = MatchmakingController;
