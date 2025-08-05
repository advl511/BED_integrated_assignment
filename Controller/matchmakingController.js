const matchmakingModel = require('../Model/matchmakingModel');

exports.joinQueue = async (req, res) => {
  const userId = req.user.id; // Get from JWT token

  try {
    const alreadyQueued = await matchmakingModel.checkUserInQueue(userId);
    if (alreadyQueued.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'User already in queue',
        status: 'in_queue'
      });
    }

    await matchmakingModel.insertUserToQueue(userId);

    const opponent = await matchmakingModel.getNextAvailableUser(userId);
    if (!opponent) {
      return res.status(200).json({ 
        success: true,
        message: 'Waiting for match...',
        status: 'waiting'
      });
    }

    const user1 = Math.min(userId, opponent.UserID);
    const user2 = Math.max(userId, opponent.UserID);
    const matchId = await matchmakingModel.createMatch(user1, user2);

    await matchmakingModel.markUsersMatched(matchId, user1, user2);

    res.status(200).json({ 
      success: true,
      message: 'Match found', 
      status: 'matched',
      matchId, 
      opponent: {
        id: opponent.UserID
      }
    });

  } catch (err) {
    console.error('Error in joinQueue:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

exports.leaveQueue = async (req, res) => {
  const userId = req.user.id; // Get from JWT token

  try {
    // Remove user from queue (assuming we need to add this method to the model)
    await matchmakingModel.removeUserFromQueue(userId);
    
    res.status(200).json({ 
      success: true,
      message: 'Successfully left the queue' 
    });

  } catch (err) {
    console.error('Error in leaveQueue:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

exports.getStatus = async (req, res) => {
  const userId = req.user.id; // Get from JWT token

  try {
    // Check if user is in queue
    const queueStatus = await matchmakingModel.checkUserInQueue(userId);
    
    if (queueStatus.length > 0) {
      return res.status(200).json({ 
        success: true,
        status: 'in_queue',
        message: 'User is in matchmaking queue'
      });
    }

    // Check if user has an active match (we'll need to add this method)
    // For now, return not in queue
    res.status(200).json({ 
      success: true,
      status: 'not_in_queue',
      message: 'User is not in queue'
    });

  } catch (err) {
    console.error('Error in getStatus:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};
