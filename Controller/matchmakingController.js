const sql = require('mssql');
const dbConfig = require('../dbConfig');

/**
 * Join a matchmaking queue
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const joinQueue = async (req, res) => {
    try {
        const { queueName = 'default', teamSize = 2, maxTeams = 2 } = req.body;
        const userId = req.user.user_id; // Assuming user is authenticated

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const pool = await sql.connect(dbConfig);

        // Start transaction
        const transaction = new sql.Transaction(pool);
        await transaction.begin(sql.ISOLATION_LEVEL.READ_COMMITTED);

        try {
            // Find or create a queue
            let queueResult = await transaction.request()
                .input('queueName', sql.NVarChar(100), queueName)
                .input('teamSize', sql.Int, teamSize)
                .input('maxTeams', sql.Int, maxTeams)
                .query(`
                    MERGE INTO matchmaking_queues WITH (HOLDLOCK) AS target
                    USING (VALUES (@queueName, @teamSize, @maxTeams)) AS source (queue_name, team_size, max_teams)
                    ON target.queue_name = source.queue_name AND target.status = 'waiting'
                    WHEN NOT MATCHED THEN
                        INSERT (queue_name, team_size, max_teams, status)
                        VALUES (source.queue_name, source.team_size, source.max_teams, 'waiting')
                    OUTPUT INSERTED.*;
                `);

            const queue = queueResult.recordset[0];
            const queueId = queue.queue_id;

            // Add user to queue
            await transaction.request()
                .input('queueId', sql.Int, queueId)
                .input('userId', sql.Int, userId)
                .query(`
                    IF NOT EXISTS (
                        SELECT 1 FROM queue_participants 
                        WHERE queue_id = @queueId AND user_id = @userId AND status = 'waiting'
                    )
                    BEGIN
                        INSERT INTO queue_participants (queue_id, user_id, status)
                        VALUES (@queueId, @userId, 'waiting');
                    END
                `);

            // Check if we have enough players to start a match
            const participantsResult = await transaction.request()
                .input('queueId', sql.Int, queueId)
                .query('SELECT COUNT(*) as count FROM queue_participants WHERE queue_id = @queueId AND status = \'waiting\'');
            
            const totalPlayers = participantsResult.recordset[0].count;
            const playersNeeded = queue.team_size * queue.max_teams;

            if (totalPlayers >= playersNeeded) {
                // Start a new match
                await startMatch(transaction, queue);
            }

            await transaction.commit();
            res.json({ message: 'Joined queue successfully', queueId, totalPlayers, playersNeeded });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
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
 * Leave a matchmaking queue
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const leaveQueue = async (req, res) => {
    try {
        const { queueId } = req.params;
        const userId = req.user.user_id; // Assuming user is authenticated

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const pool = await sql.connect(dbConfig);
        
        await pool.request()
            .input('queueId', sql.Int, queueId)
            .input('userId', sql.Int, userId)
            .query(`
                UPDATE queue_participants 
                SET status = 'left' 
                WHERE queue_id = @queueId AND user_id = @userId AND status = 'waiting';
            `);

        res.json({ message: 'Left queue successfully' });
    } catch (error) {
        console.error('Error leaving queue:', error);
        res.status(500).json({ error: 'Failed to leave queue', details: error.message });
    }
};

/**
 * Get current queue status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getQueueStatus = async (req, res) => {
    try {
        const { queueId } = req.params;
        const pool = await sql.connect(dbConfig);
        
        // Get queue details
        const queueResult = await pool.request()
            .input('queueId', sql.Int, queueId)
            .query('SELECT * FROM matchmaking_queues WHERE queue_id = @queueId');
        
        if (queueResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Queue not found' });
        }
        
        const queue = queueResult.recordset[0];
        
        // Get participants
        const participantsResult = await pool.request()
            .input('queueId', sql.Int, queueId)
            .query(`
                SELECT qp.*, u.username, u.profile_picture_url 
                FROM queue_participants qp
                JOIN users u ON qp.user_id = u.user_id
                WHERE qp.queue_id = @queueId AND qp.status = 'waiting'
                ORDER BY qp.joined_at ASC
            `);
        
        const participants = participantsResult.recordset;
        const totalPlayers = participants.length;
        const playersNeeded = queue.team_size * queue.max_teams;
        
        res.json({
            queue,
            participants,
            totalPlayers,
            playersNeeded,
            playersRemaining: Math.max(0, playersNeeded - totalPlayers)
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
        const userId = req.user.user_id; // Assuming user is authenticated

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const pool = await sql.connect(dbConfig);
        
        // Find user's current match
        const matchResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT mt.*, mq.queue_name, mq.team_size
                FROM match_teams mt
                JOIN matchmaking_queues mq ON mt.queue_id = mq.queue_id
                WHERE mt.match_id IN (
                    SELECT match_id FROM team_members WHERE user_id = @userId
                )
                AND mt.status = 'in_progress'
            `);
        
        if (matchResult.recordset.length === 0) {
            return res.status(404).json({ message: 'No active match found' });
        }
        
        const match = matchResult.recordset[0];
        
        // Get team members
        const teamsResult = await pool.request()
            .input('matchId', sql.Int, match.match_id)
            .query(`
                SELECT tm.team_number, u.user_id, u.username, u.profile_picture_url
                FROM team_members tm
                JOIN users u ON tm.user_id = u.user_id
                WHERE tm.match_id = @matchId
                ORDER BY tm.team_number, u.username
            `);
        
        // Organize by team
        const teams = {};
        teamsResult.recordset.forEach(row => {
            if (!teams[row.team_number]) {
                teams[row.team_number] = [];
            }
            teams[row.team_number].push({
                userId: row.user_id,
                username: row.username,
                profilePicture: row.profile_picture_url
            });
        });
        
        res.json({
            matchId: match.match_id,
            queueName: match.queue_name,
            teamSize: match.team_size,
            teams: teams,
            status: match.status
        });
    } catch (error) {
        console.error('Error getting current match:', error);
        res.status(500).json({ error: 'Failed to get current match', details: error.message });
    }
};

// Get recent matches for a user
const getRecentMatches = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const pool = await sql.connect(dbConfig);

        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT TOP 10 m.match_id, m.created_at, m.status,
                       STRING_AGG(u.username, ', ') AS participants
                FROM match_teams m
                JOIN team_members tm ON m.match_id = tm.match_id
                JOIN users u ON tm.user_id = u.user_id
                WHERE tm.user_id = @userId
                GROUP BY m.match_id, m.created_at, m.status
                ORDER BY m.created_at DESC
            `);

        res.json({ matches: result.recordset });
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
