const sql = require('mssql');
const dbConfig = require('../dbConfig');

class MatchmakingController {
    // Join the matchmaking queue
    static async joinQueue(req, res) {
        const transaction = new sql.Transaction(await sql.connect(dbConfig));
        
        try {
            await transaction.begin();
            const request = new sql.Request(transaction);
            
            const { userId, playerName, skillLevel = 'beginner' } = req.body;

            if (!userId || !playerName) {
                await transaction.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message: 'User ID and player name are required' 
                });
            }

            // Check if user is already in queue
            const existingUser = await request
                .input('userId', sql.NVarChar, userId)
                .query('SELECT * FROM matchmaking_queue WHERE user_id = @userId');

            if (existingUser.recordset.length > 0) {
                await transaction.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message: 'You are already in the queue' 
                });
            }

            // Check if user has an ongoing game
            const ongoingGame = await request
                .input('userId', sql.NVarChar, userId)
                .query(`
                    SELECT * FROM ongoing_games 
                    WHERE (player1_id = @userId OR player2_id = @userId) 
                    AND status IN ('in_progress', 'voting')
                `);

            if (ongoingGame.recordset.length > 0) {
                await transaction.rollback();
                return res.json({ 
                    success: true,
                    hasMatch: true,
                    match: this.formatMatchForResponse(ongoingGame.recordset[0], userId)
                });
            }

            // Add user to queue
            await request
                .input('userId', sql.NVarChar, userId)
                .input('playerName', sql.NVarChar, playerName)
                .input('skillLevel', sql.NVarChar, skillLevel)
                .query(`
                    INSERT INTO matchmaking_queue (user_id, player_name, skill_level, status, joined_at)
                    VALUES (@userId, @playerName, @skillLevel, 'waiting', GETDATE())
                `);

            // Check if we can make a match (need at least 2 players)
            const waitingPlayers = await request
                .query(`
                    SELECT TOP 2 * 
                    FROM matchmaking_queue 
                    WHERE status = 'waiting' 
                    ORDER BY joined_at ASC
                `);

            let response = { success: true };

            if (waitingPlayers.recordset.length >= 2) {
                // Create a match with the first 2 players
                const match = await this.createMatchInTransaction(request, waitingPlayers.recordset);
                response = {
                    success: true,
                    hasMatch: true,
                    match: this.formatMatchForResponse(match, userId)
                };
            } else {
                // Return queue position if no match yet
                const queuePosition = await this.getQueuePosition(transaction, userId);
                response = {
                    success: true,
                    hasMatch: false,
                    queuePosition,
                    totalInQueue: waitingPlayers.recordset.length,
                    message: 'Successfully joined the queue'
                };
            }

            await transaction.commit();
            res.json(response);

        } catch (error) {
            await transaction.rollback();
            console.error('Error in joinQueue:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        } finally {
            transaction.rollback().catch(() => {}); // Ensure transaction is cleaned up
        }
    }
    
    // Helper to format match data for response
    static formatMatchForResponse(match, currentUserId) {
        const isPlayer1 = match.player1_id === currentUserId;
        const opponentId = isPlayer1 ? match.player2_id : match.player1_id;
        const opponentName = isPlayer1 ? match.player2_name : match.player1_name;
        
        return {
            gameId: match.game_id,
            facility: {
                id: match.facility_id,
                name: match.facility_name || 'Unknown Facility',
                address: match.address || 'Address not available'
            },
            opponent: {
                id: opponentId,
                name: opponentName
            },
            status: match.status,
            canVote: match.status === 'voting' && !(isPlayer1 ? match.player1_voted : match.player2_voted),
            hasVoted: isPlayer1 ? match.player1_voted : match.player2_voted,
            startedAt: match.started_at || new Date().toISOString()
        };
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
        const transaction = new sql.Transaction(await sql.connect(dbConfig));
        
        try {
            await transaction.begin();
            const request = new sql.Request(transaction);
            
            const { gameId, userId } = req.body;

            if (!gameId || !userId) {
                await transaction.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message: 'Game ID and User ID are required' 
                });
            }

            // Verify user is part of this game
            const game = await request
                .input('gameId', sql.Int, gameId)
                .input('userId', sql.NVarChar, userId)
                .query(`
                    SELECT * 
                    FROM ongoing_games 
                    WHERE game_id = @gameId 
                    AND (player1_id = @userId OR player2_id = @userId)
                `);

            if (game.recordset.length === 0) {
                await transaction.rollback();
                return res.status(404).json({ 
                    success: false, 
                    message: 'Game not found or you are not part of this game' 
                });
            }

            // Update game status to voting
            await request
                .input('gameId', sql.Int, gameId)
                .query('UPDATE ongoing_games SET status = \'voting\' WHERE game_id = @gameId');

            await transaction.commit();
            
            res.json({ 
                success: true, 
                message: 'Voting phase started' 
            });

        } catch (error) {
            await transaction.rollback();
            console.error('Error starting voting:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        } finally {
            transaction.rollback().catch(() => {}); // Ensure transaction is cleaned up
        }
    }

    // Vote for the winner of a match
    static async voteWinner(req, res) {
        const transaction = new sql.Transaction(await sql.connect(dbConfig));
        
        try {
            await transaction.begin();
            const request = new sql.Request(transaction);
            
            const { gameId, userId, winnerId } = req.body;

            if (!gameId || !userId || !winnerId) {
                await transaction.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message: 'Game ID, user ID, and winner ID are required' 
                });
            }

            // Check if the game exists and is in voting status
            const gameResult = await request
                .input('gameId', sql.Int, gameId)
                .query(`
                    SELECT * 
                    FROM ongoing_games 
                    WHERE game_id = @gameId 
                    AND status IN ('in_progress', 'voting')
                `);

            if (gameResult.recordset.length === 0) {
                await transaction.rollback();
                return res.status(404).json({ 
                    success: false, 
                    message: 'Game not found or already completed' 
                });
            }

            const currentGame = gameResult.recordset[0];
            
            // Check if the user is part of this game
            if (currentGame.player1_id !== userId && currentGame.player2_id !== userId) {
                await transaction.rollback();
                return res.status(403).json({ 
                    success: false, 
                    message: 'You are not part of this game' 
                });
            }

            // Check if the winner is one of the players
            if (currentGame.player1_id !== winnerId && currentGame.player2_id !== winnerId) {
                await transaction.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message: 'Invalid winner ID' 
                });
            }

            // Check if the user has already voted
            const hasVoted = (currentGame.player1_id === userId && currentGame.player1_voted) || 
                            (currentGame.player2_id === userId && currentGame.player2_voted);
            
            if (hasVoted) {
                await transaction.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message: 'You have already voted' 
                });
            }

            // Update the game status to voting if it's the first vote
            if (currentGame.status !== 'voting') {
                await request
                    .input('gameId', sql.Int, gameId)
                    .query('UPDATE ongoing_games SET status = \'voting\' WHERE game_id = @gameId');
            }

            // Record the vote
            const isPlayer1 = currentGame.player1_id === userId;
            await request
                .input('gameId', sql.Int, gameId)
                .input('winnerId', sql.NVarChar, winnerId)
                .query(isPlayer1 ? 
                    'UPDATE ongoing_games SET player1_voted = 1, player1_vote = @winnerId WHERE game_id = @gameId' :
                    'UPDATE ongoing_games SET player2_voted = 1, player2_vote = @winnerId WHERE game_id = @gameId'
                );

            // Check if both players have voted
            const updatedGame = await request
                .input('gameId', sql.Int, gameId)
                .query('SELECT * FROM ongoing_games WHERE game_id = @gameId');

            const gameData = updatedGame.recordset[0];
            const bothVoted = gameData.player1_voted && gameData.player2_voted;

            let result = {
                success: true,
                message: 'Vote recorded',
                hasVoted: true,
                bothVoted,
                matchComplete: false
            };

            if (bothVoted) {
                // Both players have voted, determine the winner
                let winnerId;
                let isDraw = false;
                
                // If both players voted for the same winner
                if (gameData.player1_vote === gameData.player2_vote) {
                    winnerId = gameData.player1_vote;
                } else {
                    // Players disagreed, pick a random winner (or implement tiebreaker logic)
                    winnerId = Math.random() > 0.5 ? gameData.player1_vote : gameData.player2_vote;
                    isDraw = false; // Set to true if you want to consider this a draw
                }
                
                // Complete the match
                await this.completeMatch(transaction, gameData, winnerId, isDraw);
                
                result.matchComplete = true;
                result.winnerId = winnerId;
                result.isDraw = isDraw;
                result.message = 'Match completed successfully';
            }

            await transaction.commit();
            res.json(result);

        } catch (error) {
            await transaction.rollback();
            console.error('Error in voteWinner:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        } finally {
            transaction.rollback().catch(() => {}); // Ensure transaction is cleaned up
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

    // Helper method to complete a match
    static async completeMatch(pool, gameData, winnerId, isDraw) {
        try {
            // Move to match history
            await pool.request()
                .input('facilityId', sql.Int, gameData.facility_id)
                .input('winnerId', sql.NVarChar, winnerId)
                .input('winnerName', sql.NVarChar, winnerId === gameData.player1_id ? gameData.player1_name : gameData.player2_name)
                .input('loserId', sql.NVarChar, winnerId === gameData.player1_id ? gameData.player2_id : gameData.player1_id)
                .input('loserName', sql.NVarChar, winnerId === gameData.player1_id ? gameData.player2_name : gameData.player1_name)
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

    // Helper method to create a match within an existing transaction
    static async createMatchInTransaction(request, players) {
        try {
            const player1 = players[0];
            const player2 = players[1];

            // Get a random facility
            const facilities = await request
                .query('SELECT * FROM sports_facilities WHERE is_active = 1');
            
            if (facilities.recordset.length === 0) {
                throw new Error('No active facilities available');
            }
            
            const randomFacility = facilities.recordset[Math.floor(Math.random() * facilities.recordset.length)];

            // Create ongoing game
            const gameResult = await request
                .input('facilityId', sql.Int, randomFacility.facility_id)
                .input('player1Id', sql.NVarChar, player1.user_id)
                .input('player1Name', sql.NVarChar, player1.player_name)
                .input('player2Id', sql.NVarChar, player2.user_id)
                .input('player2Name', sql.NVarChar, player2.player_name)
                .query(`
                    INSERT INTO ongoing_games 
                    (facility_id, player1_id, player1_name, player2_id, player2_name, status)
                    OUTPUT INSERTED.*
                    VALUES (@facilityId, @player1Id, @player1Name, @player2Id, @player2Name, 'in_progress')
                `);

            const game = gameResult.recordset[0];

            // Remove players from queue
            await request
                .input('player1Id', sql.NVarChar, player1.user_id)
                .input('player2Id', sql.NVarChar, player2.user_id)
                .query('DELETE FROM matchmaking_queue WHERE user_id IN (@player1Id, @player2Id)');
            
            return game;

        } catch (error) {
            console.error('Error creating match in transaction:', error);
            throw error;
        }
    }

    // Helper method to create a match
    static async createMatch(pool, players) {
        const transaction = new sql.Transaction(pool);
        
        try {
            await transaction.begin();
            const request = new sql.Request(transaction);
            
            const game = await this.createMatchInTransaction(request, players);
            await transaction.commit();
            
            return game;

        } catch (error) {
            await transaction.rollback();
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
    
}

module.exports = MatchmakingController;
