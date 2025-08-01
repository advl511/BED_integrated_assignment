const sql = require('mssql');
const config = require('./dbConfig');

async function sendFriendRequest(fromUserId, toUserId) {
  try {
    await sql.connect(config);
    
    // Check if friendship already exists
    const existingFriendship = await sql.query`
      SELECT status FROM friendships 
      WHERE (user_id = ${fromUserId} AND friend_user_id = ${toUserId}) 
         OR (user_id = ${toUserId} AND friend_user_id = ${fromUserId})
    `;
    
    if (existingFriendship.recordset.length > 0) {
      const status = existingFriendship.recordset[0].status;
      if (status === 'accepted') {
        throw new Error('You are already friends with this user');
      } else if (status === 'pending') {
        throw new Error('Friend request already sent');
      } else if (status === 'blocked') {
        throw new Error('Cannot send friend request to this user');
      }
    }
    
    const result = await sql.query`
      INSERT INTO friendships (user_id, friend_user_id, status, created_at)
      VALUES (${fromUserId}, ${toUserId}, 'pending', GETDATE())
    `;
    
    return result;
  } catch (err) {
    throw err;
  }
}

async function acceptFriendRequest(requestId, userId) {
  try {
    await sql.connect(config);
    
    // Update the request status
    const result = await sql.query`
      UPDATE friendships 
      SET status = 'accepted', updated_at = GETDATE()
      WHERE friendship_id = ${requestId} AND friend_user_id = ${userId} AND status = 'pending'
    `;
    
    if (result.rowsAffected[0] === 0) {
      throw new Error('Friend request not found or already processed');
    }
    
    return result;
  } catch (err) {
    throw err;
  }
}

async function rejectFriendRequest(requestId, userId) {
  try {
    await sql.connect(config);
    
    const result = await sql.query`
      UPDATE friendships 
      SET status = 'rejected', updated_at = GETDATE()
      WHERE friendship_id = ${requestId} AND friend_user_id = ${userId} AND status = 'pending'
    `;
    
    if (result.rowsAffected[0] === 0) {
      throw new Error('Friend request not found or already processed');
    }
    
    return result;
  } catch (err) {
    throw err;
  }
}

async function getFriends(userId) {
  try {
    await sql.connect(config);
    const result = await sql.query`
      SELECT DISTINCT u.user_id, u.username, u.email, u.first_name, u.last_name,
             p.profile_picture_url
      FROM users u
      LEFT JOIN profiles p ON u.user_id = p.user_id
      WHERE u.user_id IN (
        SELECT friend_user_id FROM friendships 
        WHERE user_id = ${userId} AND status = 'accepted'
        UNION
        SELECT user_id FROM friendships 
        WHERE friend_user_id = ${userId} AND status = 'accepted'
      )
      ORDER BY u.username
    `;
    return result.recordset;
  } catch (err) {
    throw err;
  }
}

async function getPendingFriendRequests(userId) {
  try {
    await sql.connect(config);
    const result = await sql.query`
      SELECT f.friendship_id, f.created_at, u.user_id, u.username, u.email, u.first_name, u.last_name,
             p.profile_picture_url
      FROM friendships f
      JOIN users u ON f.user_id = u.user_id
      LEFT JOIN profiles p ON u.user_id = p.user_id
      WHERE f.friend_user_id = ${userId} AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `;
    return result.recordset;
  } catch (err) {
    throw err;
  }
}

async function getSentFriendRequests(userId) {
  try {
    await sql.connect(config);
    const result = await sql.query`
      SELECT f.friendship_id, f.created_at, f.status, u.user_id, u.username, u.email, u.first_name, u.last_name,
             p.profile_picture_url
      FROM friendships f
      JOIN users u ON f.friend_user_id = u.user_id
      LEFT JOIN profiles p ON u.user_id = p.user_id
      WHERE f.user_id = ${userId} AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `;
    return result.recordset;
  } catch (err) {
    throw err;
  }
}

async function removeFriend(userId, friendId) {
  try {
    await sql.connect(config);
    const result = await sql.query`
      DELETE FROM friendships 
      WHERE ((user_id = ${userId} AND friend_user_id = ${friendId}) 
          OR (user_id = ${friendId} AND friend_user_id = ${userId}))
        AND status = 'accepted'
    `;
    
    if (result.rowsAffected[0] === 0) {
      throw new Error('Friendship not found');
    }
    
    return result;
  } catch (err) {
    throw err;
  }
}

async function getFriendshipStatus(userId, friendId) {
  try {
    await sql.connect(config);
    const result = await sql.query`
      SELECT status FROM friendships 
      WHERE (user_id = ${userId} AND friend_user_id = ${friendId}) 
         OR (user_id = ${friendId} AND friend_user_id = ${userId})
    `;
    return result.recordset[0]?.status || 'none';
  } catch (err) {
    throw err;
  }
}

async function getFriendCount(userId) {
  try {
    await sql.connect(config);
    const result = await sql.query`
      SELECT COUNT(*) as count
      FROM friendships 
      WHERE (user_id = ${userId} OR friend_user_id = ${userId}) 
        AND status = 'accepted'
    `;
    return result.recordset[0].count;
  } catch (err) {
    throw err;
  }
}

async function getMutualFriends(userId1, userId2) {
  try {
    await sql.connect(config);
    const result = await sql.query`
      SELECT DISTINCT u.user_id, u.username, u.email, u.first_name, u.last_name,
             p.profile_picture_url
      FROM users u
      LEFT JOIN profiles p ON u.user_id = p.user_id
      WHERE u.user_id IN (
        SELECT friend_user_id FROM friendships 
        WHERE user_id = ${userId1} AND status = 'accepted'
        INTERSECT
        SELECT friend_user_id FROM friendships 
        WHERE user_id = ${userId2} AND status = 'accepted'
      )
      OR u.user_id IN (
        SELECT user_id FROM friendships 
        WHERE friend_user_id = ${userId1} AND status = 'accepted'
        INTERSECT
        SELECT user_id FROM friendships 
        WHERE friend_user_id = ${userId2} AND status = 'accepted'
      )
      ORDER BY u.username
    `;
    return result.recordset;
  } catch (err) {
    throw err;
  }
}

// For testing: Remove friendship/request to allow re-adding
async function removeFriendshipCompletely(userId1, userId2) {
  try {
    await sql.connect(config);
    const result = await sql.query`
      DELETE FROM friendships 
      WHERE (user_id = ${userId1} AND friend_user_id = ${userId2}) 
         OR (user_id = ${userId2} AND friend_user_id = ${userId1})
    `;
    return result;
  } catch (err) {
    throw err;
  }
}

module.exports = {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  getPendingFriendRequests,
  getSentFriendRequests,
  removeFriend,
  getFriendshipStatus,
  getFriendCount,
  getMutualFriends,
  removeFriendshipCompletely,
};
