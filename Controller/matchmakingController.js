const sql = require('mssql');
const dbConfig = require('../dbConfig');

// Simple in-memory queue for 1v1 pickleball matchmaking
let pickleballQueue = [];
let currentMatches = new Map(); // Store active matches

/**
 * Join the 1v1 pickleball queue
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const joinQueue = async (req, res) => {
    try {
        const { userId, username } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Check if user is already in queue
        const existingUser = pickleballQueue.find(player => player.userId === userId);
        if (existingUser) {
            return res.status(409).json({ 
                error: 'Already in queue', 
                queueId: 'pickleball_1v1',
                position: pickleballQueue.indexOf(existingUser) + 1,
                totalPlayers: pickleballQueue.length
            });
        }

        // Add user to queue
        const player = {
            userId,
            username: username || `Player_${userId.substr(0, 4)}`,
            joinedAt: new Date()
        };
        
        pickleballQueue.push(player);
        
        // Check if we can make a match (need 2 players for 1v1)
        if (pickleballQueue.length >= 2) {
            const player1 = pickleballQueue.shift();
            const player2 = pickleballQueue.shift();
            
            const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const match = {
                matchId,
                player1,
                player2,
                startedAt: new Date(),
                status: 'in_progress'
            };
            
            currentMatches.set(matchId, match);
            
            // Notify both players about the match
            return res.json({
                message: 'Match found!',
                matchFound: true,
                matchId,
                opponent: player1.userId === userId ? player2 : player1,
                queueId: 'pickleball_1v1'
            });
        }
        
        res.json({ 
            message: 'Joined queue successfully', 
            queueId: 'pickleball_1v1',
            position: pickleballQueue.length,
            totalPlayers: pickleballQueue.length,
            playersNeeded: 2
        });
        
    } catch (error) {
        console.error('Error joining queue:', error);
        res.status(500).json({ error: 'Failed to join queue', details: error.message });
    }
};

/**
 * Start a new match with the current queue participants
 * @param {sql.Transaction} transaction - SQL transaction
 * @param {Object} queue - Queue details
 */
async function startMatch(transaction, queue) {
    const queueId = queue.queue_id;
    
    // Mark queue as matching
    await transaction.request()
        .input('queueId', sql.Int, queueId)
        .query(`UPDATE matchmaking_queues SET status = 'matching', started_at = GETDATE() WHERE queue_id = @queueId`);

    // Get all waiting participants
    const participants = await transaction.request()
        .input('queueId', sql.Int, queueId)
        .query(`
            SELECT qp.user_id, u.username, u.profile_picture_url 
            FROM queue_participants qp
            JOIN users u ON qp.user_id = u.user_id
            WHERE qp.queue_id = @queueId AND qp.status = 'waiting'
            ORDER BY qp.joined_at ASC
        `);

    const participantsList = participants.recordset;
    const teamSize = queue.team_size;
    const teamCount = Math.min(Math.floor(participantsList.length / teamSize), queue.max_teams);
    
    if (teamCount < 1) return;

    // Create a new match
    const matchResult = await transaction.request()
        .input('queueId', sql.Int, queueId)
        .query('INSERT INTO match_teams (queue_id, team_number, status) VALUES (@queueId, 1, \'waiting\'); SELECT SCOPE_IDENTITY() as match_id');
    
    const matchId = matchResult.recordset[0].match_id;

    // Assign participants to teams
    for (let i = 0; i < teamCount; i++) {
        for (let j = 0; j < teamSize; j++) {
            const participantIndex = i * teamSize + j;
            if (participantIndex >= participantsList.length) break;
            
            const participant = participantsList[participantIndex];
            
            await transaction.request()
                .input('matchId', sql.Int, matchId)
                .input('userId', sql.Int, participant.user_id)
                .input('teamNumber', sql.Int, i + 1)
                .query('INSERT INTO team_members (match_id, user_id, team_number) VALUES (@matchId, @userId, @teamNumber)');
            
            // Mark participant as matched
            await transaction.request()
                .input('queueId', sql.Int, queueId)
                .input('userId', sql.Int, participant.user_id)
                .query('UPDATE queue_participants SET status = \'matched\' WHERE queue_id = @queueId AND user_id = @userId');
        }
    }

    // Update match status
    await transaction.request()
        .input('matchId', sql.Int, matchId)
        .query('UPDATE match_teams SET status = \'in_progress\' WHERE match_id = @matchId');

    // Update queue status
    await transaction.request()
        .input('queueId', sql.Int, queueId)
        .query('UPDATE matchmaking_queues SET status = \'waiting\' WHERE queue_id = @queueId');
}

/**
 * Leave the 1v1 pickleball queue
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const leaveQueue = async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Remove user from queue
        const userIndex = pickleballQueue.findIndex(player => player.userId === userId);
        if (userIndex !== -1) {
            pickleballQueue.splice(userIndex, 1);
        }

        res.json({ message: 'Left queue successfully' });
    } catch (error) {
        console.error('Error leaving queue:', error);
        res.status(500).json({ error: 'Failed to leave queue', details: error.message });
    }
};

/**
 * Get current 1v1 pickleball queue status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getQueueStatus = async (req, res) => {
    try {
        const queueId = req.params.queueId || 'pickleball_1v1';
        
        if (queueId !== 'pickleball_1v1') {
            return res.status(404).json({ error: 'Queue not found' });
        }
        
        const totalPlayers = pickleballQueue.length;
        const playersNeeded = 2;
        
        res.json({
            queueName: '1v1 Pickleball',
            participants: pickleballQueue,
            totalPlayers,
            playersNeeded,
            playersRemaining: Math.max(0, playersNeeded - totalPlayers),
            matchFound: false
        });
    } catch (error) {
        console.error('Error getting queue status:', error);
        res.status(500).json({ error: 'Failed to get queue status', details: error.message });
    }
};

/**
 * Get user's current match
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCurrentMatch = async (req, res) => {
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Find user's current match
        let userMatch = null;
        for (const [matchId, match] of currentMatches.entries()) {
            if (match.player1.userId === userId || match.player2.userId === userId) {
                userMatch = match;
                break;
            }
        }
        
        if (!userMatch) {
            return res.status(404).json({ message: 'No active match found' });
        }
        
        const opponent = userMatch.player1.userId === userId ? userMatch.player2 : userMatch.player1;
        
        res.json({
            matchId: userMatch.matchId,
            opponent: opponent,
            startedAt: userMatch.startedAt,
            status: userMatch.status
        });
    } catch (error) {
        console.error('Error getting current match:', error);
        res.status(500).json({ error: 'Failed to get current match', details: error.message });
    }
};

// Get recent matches for a user
const getRecentMatches = async (req, res) => {
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Filter matches where the user participated
        const userMatches = [];
        for (const [matchId, match] of currentMatches.entries()) {
            if (match.player1.userId === userId || match.player2.userId === userId) {
                const opponent = match.player1.userId === userId ? match.player2 : match.player1;
                userMatches.push({
                    matchId: match.matchId,
                    opponent: opponent.username,
                    startedAt: match.startedAt,
                    status: match.status
                });
            }
        }

        // Sort by most recent first
        userMatches.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));

        res.json({ matches: userMatches.slice(0, 10) }); // Return last 10 matches
    } catch (error) {
        console.error('Error getting recent matches:', error);
        res.status(500).json({ error: 'Failed to get recent matches', details: error.message });
    }
};

module.exports = {
    joinQueue,
    leaveQueue,
    getQueueStatus,
    getCurrentMatch,
    startMatch,
    getRecentMatches
};
