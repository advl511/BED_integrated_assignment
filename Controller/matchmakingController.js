const sql = require('mssql');
const dbConfig = require('../dbConfig');

class MatchmakingController {
    // Join the matchmaking queue
    static async joinQueue(req, res) {
        try {
            const { userId, playerName, skillLevel = 'beginner' } = req.body;

            if (!userId || !playerName) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'User ID and player name are required' 
                });
            }

            const pool = await sql.connect(dbConfig);

            // Check if user is already in queue
            const existingUser = await pool.request()
                .input('userId', sql.NVarChar, userId)
                .query('SELECT * FROM matchmaking_queue WHERE user_id = @userId AND status = \'waiting\'');

            if (existingUser.recordset.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'You are already in the queue' 
                });
            }

            // Check if user has an ongoing game
            const ongoingGame = await pool.request()
                .input('userId', sql.NVarChar, userId)
                .query('SELECT * FROM ongoing_games WHERE (player1_id = @userId OR player2_id = @userId) AND status IN (\'in_progress\', \'voting\')');

            if (ongoingGame.recordset.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'You already have an ongoing game' 
                });
            }

            // Add user to queue
            await pool.request()
                .input('userId', sql.NVarChar, userId)
                .input('playerName', sql.NVarChar, playerName)
                .input('skillLevel', sql.NVarChar, skillLevel)
                .query('INSERT INTO matchmaking_queue (user_id, player_name, skill_level) VALUES (@userId, @playerName, @skillLevel)');

            // Check if we can make a match (need at least 2 players)
            const waitingPlayers = await pool.request()
                .query('SELECT TOP 2 * FROM matchmaking_queue WHERE status = \'waiting\' ORDER BY joined_at ASC');

            if (waitingPlayers.recordset.length >= 2) {
                await this.createMatch(pool, waitingPlayers.recordset);
            }

            res.json({ 
                success: true, 
                message: 'Successfully joined the queue',
                queuePosition: await this.getQueuePosition(pool, userId)
            });

        } catch (error) {
            console.error('Error joining queue:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    }

    // Leave the matchmaking queue
    static async leaveQueue(req, res) {
        try {
            const { userId } = req.body;

            if (!userId) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'User ID is required' 
                });
            }

            const pool = await sql.connect(dbConfig);

            // Update user status to 'left'
            const result = await pool.request()
                .input('userId', sql.NVarChar, userId)
                .query('UPDATE matchmaking_queue SET status = \'left\' WHERE user_id = @userId AND status = \'waiting\'');

            if (result.rowsAffected[0] === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'You are not in the queue' 
                });
            }

            res.json({ 
                success: true, 
                message: 'Successfully left the queue' 
            });

        } catch (error) {
            console.error('Error leaving queue:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    }

    // Get queue status for a user
    static async getQueueStatus(req, res) {
        try {
            const { userId } = req.params;

            if (!userId) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'User ID is required' 
                });
            }

            const pool = await sql.connect(dbConfig);

            // Check if user is in queue
            const userInQueue = await pool.request()
                .input('userId', sql.NVarChar, userId)
                .query('SELECT * FROM matchmaking_queue WHERE user_id = @userId AND status = \'waiting\'');

            if (userInQueue.recordset.length === 0) {
                return res.json({ 
                    success: true, 
                    inQueue: false,
                    message: 'Not in queue'
                });
            }

            const queuePosition = await MatchmakingController.getQueuePosition(pool, userId);
            const totalInQueue = await pool.request()
                .query('SELECT COUNT(*) as count FROM matchmaking_queue WHERE status = \'waiting\'');

            res.json({ 
                success: true, 
                inQueue: true,
                queuePosition,
                totalInQueue: totalInQueue.recordset[0].count,
                joinedAt: userInQueue.recordset[0].joined_at
            });

        } catch (error) {
            console.error('Error getting queue status:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    }

    // Get current match for a user
    static async getCurrentMatch(req, res) {
        try {
            const { userId } = req.params;

            if (!userId) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'User ID is required' 
                });
            }

            const pool = await sql.connect(dbConfig);

            const currentMatch = await pool.request()
                .input('userId', sql.NVarChar, userId)
                .query(`
                    SELECT og.*, sf.facility_name, sf.address, sf.latitude, sf.longitude
                    FROM ongoing_games og
                    JOIN sports_facilities sf ON og.facility_id = sf.facility_id
                    WHERE (og.player1_id = @userId OR og.player2_id = @userId) 
                    AND og.status IN ('in_progress', 'voting')
                `);

            if (currentMatch.recordset.length === 0) {
                return res.json({ 
                    success: true, 
                    hasMatch: false 
                });
            }

            const match = currentMatch.recordset[0];
            const isPlayer1 = match.player1_id === userId;

            res.json({ 
                success: true, 
                hasMatch: true,
                match: {
                    gameId: match.game_id,
                    facility: {
                        name: match.facility_name,
                        address: match.address,
                        latitude: match.latitude,
                        longitude: match.longitude
                    },
                    opponent: {
                        id: isPlayer1 ? match.player2_id : match.player1_id,
                        name: isPlayer1 ? match.player2_name : match.player1_name
                    },
                    startedAt: match.started_at,
                    status: match.status,
                    hasVoted: isPlayer1 ? match.player1_voted : match.player2_voted,
                    canVote: match.status === 'voting'
                }
            });

        } catch (error) {
            console.error('Error getting current match:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    }

    // Start voting phase for a match
    static async startVoting(req, res) {
        try {
            const { gameId, userId } = req.body;

            if (!gameId || !userId) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Game ID and User ID are required' 
                });
            }

            const pool = await sql.connect(dbConfig);

            // Verify user is part of this game
            const game = await pool.request()
                .input('gameId', sql.Int, gameId)
                .input('userId', sql.NVarChar, userId)
                .query('SELECT * FROM ongoing_games WHERE game_id = @gameId AND (player1_id = @userId OR player2_id = @userId)');

            if (game.recordset.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Game not found or you are not part of this game' 
                });
            }

            // Update game status to voting
            await pool.request()
                .input('gameId', sql.Int, gameId)
                .query('UPDATE ongoing_games SET status = \'voting\' WHERE game_id = @gameId');

            res.json({ 
                success: true, 
                message: 'Voting phase started' 
            });

        } catch (error) {
            console.error('Error starting voting:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    }

    // Vote for match winner
    static async voteWinner(req, res) {
        try {
            const { gameId, userId, winnerId } = req.body;

            if (!gameId || !userId || !winnerId) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Game ID, User ID, and Winner ID are required' 
                });
            }

            const pool = await sql.connect(dbConfig);

            // Get game details
            const game = await pool.request()
                .input('gameId', sql.Int, gameId)
                .query('SELECT * FROM ongoing_games WHERE game_id = @gameId');

            if (game.recordset.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Game not found' 
                });
            }

            const gameData = game.recordset[0];
            const isPlayer1 = gameData.player1_id === userId;
            const isPlayer2 = gameData.player2_id === userId;

            if (!isPlayer1 && !isPlayer2) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'You are not part of this game' 
                });
            }

            // Update vote
            let updateQuery;
            if (isPlayer1) {
                updateQuery = 'UPDATE ongoing_games SET player1_voted = 1, player1_vote_winner = @winnerId WHERE game_id = @gameId';
            } else {
                updateQuery = 'UPDATE ongoing_games SET player2_voted = 1, player2_vote_winner = @winnerId WHERE game_id = @gameId';
            }

            await pool.request()
                .input('gameId', sql.Int, gameId)
                .input('winnerId', sql.NVarChar, winnerId)
                .query(updateQuery);

            // Check if both players have voted
            const updatedGame = await pool.request()
                .input('gameId', sql.Int, gameId)
                .query('SELECT * FROM ongoing_games WHERE game_id = @gameId');

            const updatedGameData = updatedGame.recordset[0];

            if (updatedGameData.player1_voted && updatedGameData.player2_voted) {
                await this.completeMatch(pool, updatedGameData);
            }

            res.json({ 
                success: true, 
                message: 'Vote recorded successfully' 
            });

        } catch (error) {
            console.error('Error voting for winner:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    }

    // Get total queue count
    static async getQueueCount(req, res) {
        try {
            const pool = await sql.connect(dbConfig);

            const result = await pool.request()
                .query('SELECT COUNT(*) as count FROM matchmaking_queue WHERE status = \'waiting\'');

            res.json({ 
                success: true, 
                count: result.recordset[0].count 
            });

        } catch (error) {
            console.error('Error getting queue count:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    }

    // Get match history for a user
    static async getMatchHistory(req, res) {
        try {
            const { userId } = req.params;

            if (!userId) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'User ID is required' 
                });
            }

            const pool = await sql.connect(dbConfig);

            const matches = await pool.request()
                .input('userId', sql.NVarChar, userId)
                .query(`
                    SELECT mh.*, sf.facility_name, sf.address
                    FROM match_history mh
                    JOIN sports_facilities sf ON mh.facility_id = sf.facility_id
                    WHERE mh.winner_id = @userId OR mh.loser_id = @userId
                    ORDER BY mh.completed_at DESC
                `);

            const formattedMatches = matches.recordset.map(match => ({
                matchId: match.match_id,
                facility: {
                    name: match.facility_name,
                    address: match.address
                },
                opponent: {
                    id: match.winner_id === userId ? match.loser_id : match.winner_id,
                    name: match.winner_id === userId ? match.loser_name : match.winner_name
                },
                result: match.winner_id === userId ? 'won' : 'lost',
                playedAt: match.played_at,
                completedAt: match.completed_at
            }));

            res.json({ 
                success: true, 
                matches: formattedMatches 
            });

        } catch (error) {
            console.error('Error getting match history:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    }

    // Helper method to create a match
    static async createMatch(pool, players) {
        try {
            const player1 = players[0];
            const player2 = players[1];

            // Get a random facility
            const facilities = await pool.request()
                .query('SELECT * FROM sports_facilities WHERE is_active = 1');
            
            const randomFacility = facilities.recordset[Math.floor(Math.random() * facilities.recordset.length)];

            // Create ongoing game
            await pool.request()
                .input('facilityId', sql.Int, randomFacility.facility_id)
                .input('player1Id', sql.NVarChar, player1.user_id)
                .input('player1Name', sql.NVarChar, player1.player_name)
                .input('player2Id', sql.NVarChar, player2.user_id)
                .input('player2Name', sql.NVarChar, player2.player_name)
                .query(`
                    INSERT INTO ongoing_games (facility_id, player1_id, player1_name, player2_id, player2_name)
                    VALUES (@facilityId, @player1Id, @player1Name, @player2Id, @player2Name)
                `);

            // Update queue status for matched players
            await pool.request()
                .input('player1Id', sql.NVarChar, player1.user_id)
                .input('player2Id', sql.NVarChar, player2.user_id)
                .query('UPDATE matchmaking_queue SET status = \'matched\' WHERE user_id IN (@player1Id, @player2Id)');

        } catch (error) {
            console.error('Error creating match:', error);
            throw error;
        }
    }

    // Helper method to complete a match
    static async completeMatch(pool, gameData) {
        try {
            // Determine winner based on votes
            let winnerId, winnerName, loserId, loserName;

            if (gameData.player1_vote_winner === gameData.player2_vote_winner) {
                // Both players agree on winner
                winnerId = gameData.player1_vote_winner;
                if (winnerId === gameData.player1_id) {
                    winnerName = gameData.player1_name;
                    loserId = gameData.player2_id;
                    loserName = gameData.player2_name;
                } else {
                    winnerName = gameData.player2_name;
                    loserId = gameData.player1_id;
                    loserName = gameData.player1_name;
                }
            } else {
                // Players disagree, randomly select winner (or implement tie-breaking logic)
                const randomWinner = Math.random() < 0.5 ? 1 : 2;
                if (randomWinner === 1) {
                    winnerId = gameData.player1_id;
                    winnerName = gameData.player1_name;
                    loserId = gameData.player2_id;
                    loserName = gameData.player2_name;
                } else {
                    winnerId = gameData.player2_id;
                    winnerName = gameData.player2_name;
                    loserId = gameData.player1_id;
                    loserName = gameData.player1_name;
                }
            }

            // Move to match history
            await pool.request()
                .input('facilityId', sql.Int, gameData.facility_id)
                .input('winnerId', sql.NVarChar, winnerId)
                .input('winnerName', sql.NVarChar, winnerName)
                .input('loserId', sql.NVarChar, loserId)
                .input('loserName', sql.NVarChar, loserName)
                .input('playedAt', sql.DateTime2, gameData.started_at)
                .query(`
                    INSERT INTO match_history (facility_id, winner_id, winner_name, loser_id, loser_name, played_at)
                    VALUES (@facilityId, @winnerId, @winnerName, @loserId, @loserName, @playedAt)
                `);

            // Remove from ongoing games
            await pool.request()
                .input('gameId', sql.Int, gameData.game_id)
                .query('DELETE FROM ongoing_games WHERE game_id = @gameId');

        } catch (error) {
            console.error('Error completing match:', error);
            throw error;
        }
    }

    // Helper method to get queue position
    static async getQueuePosition(pool, userId) {
        try {
            const result = await pool.request()
                .input('userId', sql.NVarChar, userId)
                .query(`
                    SELECT COUNT(*) + 1 as position
                    FROM matchmaking_queue mq1
                    WHERE mq1.status = 'waiting' 
                    AND mq1.joined_at < (
                        SELECT joined_at 
                        FROM matchmaking_queue mq2 
                        WHERE mq2.user_id = @userId AND mq2.status = 'waiting'
                    )
                `);

            return result.recordset[0]?.position || 1;
        } catch (error) {
            console.error('Error getting queue position:', error);
            return 1;
        }
    }
}

module.exports = MatchmakingController;
