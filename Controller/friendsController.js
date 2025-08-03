const friendsModel = require('../Model/friendsModel.js');

async function sendFriendRequest(req, res) {
  try {
    const { fromUserId, toUserId } = req.body;
    
    if (!fromUserId || !toUserId) {
      return res.status(400).json({ error: 'From user ID and to user ID are required' });
    }
    
    if (fromUserId === toUserId) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }
    
    await friendsModel.sendFriendRequest(fromUserId, toUserId);
    res.status(201).json({ message: 'Friend request sent successfully' });
  } catch (err) {
    console.error('Send friend request error:', err);
    const friendshipErrors = [
      'You are already friends with this user',
      'Friend request already sent',
      'Cannot send friend request to this user'
    ];
    
    if (friendshipErrors.includes(err.message)) {
      res.status(400).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
}

async function acceptFriendRequest(req, res) {
  try {
    const { requestId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    await friendsModel.acceptFriendRequest(requestId, userId);
    res.status(200).json({ message: 'Friend request accepted successfully' });
  } catch (err) {
    console.error('Accept friend request error:', err);
    if (err.message === 'Friend request not found or already processed') {
      res.status(404).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
}

async function rejectFriendRequest(req, res) {
  try {
    const { requestId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    await friendsModel.rejectFriendRequest(requestId, userId);
    res.status(200).json({ message: 'Friend request rejected successfully' });
  } catch (err) {
    console.error('Reject friend request error:', err);
    if (err.message === 'Friend request not found or already processed') {
      res.status(404).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
}

async function getFriends(req, res) {
  try {
    const { userId } = req.params;
    
    const friends = await friendsModel.getFriends(userId);
    res.status(200).json(friends);
  } catch (err) {
    console.error('Get friends error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function getPendingRequests(req, res) {
  try {
    const { userId } = req.params;
    
    const requests = await friendsModel.getPendingFriendRequests(userId);
    res.status(200).json(requests);
  } catch (err) {
    console.error('Get pending requests error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function getSentRequests(req, res) {
  try {
    const { userId } = req.params;
    
    const requests = await friendsModel.getSentFriendRequests(userId);
    res.status(200).json(requests);
  } catch (err) {
    console.error('Get sent requests error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function removeFriend(req, res) {
  try {
    const { userId, friendId } = req.params;
    
    await friendsModel.removeFriend(userId, friendId);
    res.status(200).json({ message: 'Friend removed successfully' });
  } catch (err) {
    console.error('Remove friend error:', err);
    if (err.message === 'Friendship not found') {
      res.status(404).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
}

async function getFriendshipStatus(req, res) {
  try {
    const { userId, friendId } = req.params;
    
    const status = await friendsModel.getFriendshipStatus(userId, friendId);
    res.status(200).json({ status });
  } catch (err) {
    console.error('Get friendship status error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function getFriendCount(req, res) {
  try {
    const { userId } = req.params;
    
    const count = await friendsModel.getFriendCount(userId);
    res.status(200).json({ count });
  } catch (err) {
    console.error('Get friend count error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function getMutualFriends(req, res) {
  try {
    const { userId1, userId2 } = req.params;
    
    const mutualFriends = await friendsModel.getMutualFriends(userId1, userId2);
    res.status(200).json(mutualFriends);
  } catch (err) {
    console.error('Get mutual friends error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  getPendingRequests,
  getSentRequests,
  removeFriend,
  getFriendshipStatus,
  getFriendCount,
  getMutualFriends,
};
