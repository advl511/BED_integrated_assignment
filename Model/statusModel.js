const sql = require('mssql');
const config = require('../dbConfig');

async function createStatus(userId, content, attachments = []) {
  let pool;
  try {
    console.log('=== STATUS MODEL: Creating status ===');
    console.log('Creating status for userId:', userId, 'content:', content);
    console.log('Attachments:', attachments);
    console.log('Attachments stringified:', JSON.stringify(attachments));
    
    pool = await sql.connect(config);
    
    // First check if user exists
    const userCheck = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT user_id FROM users WHERE user_id = @userId');
    
    console.log('User check result:', userCheck.recordset);
    
    if (!userCheck.recordset || userCheck.recordset.length === 0) {
      throw new Error(`User with ID ${userId} does not exist`);
    }

    // Insert the status and get the new ID
    const insertResult = await pool.request()
      .input('userId', sql.Int, userId)
      .input('content', sql.NVarChar, content)
      .input('attachments', sql.NVarChar, JSON.stringify(attachments))
      .query(`
        INSERT INTO statuses (user_id, content, attachments)
        OUTPUT INSERTED.status_id
        VALUES (@userId, @content, @attachments)
      `);
    
    console.log('Insert result:', insertResult);
    console.log('Insert recordset:', insertResult.recordset);
    
    if (!insertResult.recordset || insertResult.recordset.length === 0) {
      throw new Error('Failed to create status - no ID returned');
    }

    const newStatusId = insertResult.recordset[0].status_id;
    console.log('New status ID:', newStatusId);

    // Return the created status with user info
    const statusResult = await pool.request()
      .input('statusId', sql.Int, newStatusId)
      .query(`
        SELECT s.*, u.username, u.email
        FROM statuses s
        JOIN users u ON s.user_id = u.user_id
        WHERE s.status_id = @statusId
      `);

    return statusResult.recordset[0];
  } catch (err) {
    console.error('Create status error details:', err);
    console.error('Error stack:', err.stack);
    throw err;
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeErr) {
        console.error('Error closing pool:', closeErr);
      }
    }
  }
}

async function getStatusesByUserId(userId, limit = 10, offset = 0) {
  let pool;
  try {
    pool = await sql.connect(config);
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset)
      .query(`
        SELECT s.*, u.username, u.email
        FROM statuses s
        JOIN users u ON s.user_id = u.user_id
        WHERE s.user_id = @userId
        ORDER BY s.created_at DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);
    return result.recordset;
  } catch (err) {
    throw err;
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeErr) {
        console.error('Error closing pool:', closeErr);
      }
    }
  }
}

async function getStatusById(statusId) {
  let pool;
  try {
    pool = await sql.connect(config);
    const result = await pool.request()
      .input('statusId', sql.Int, statusId)
      .query(`
        SELECT s.*, u.username, u.email
        FROM statuses s
        JOIN users u ON s.user_id = u.user_id
        WHERE s.status_id = @statusId
      `);
    return result.recordset[0];
  } catch (err) {
    throw err;
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeErr) {
        console.error('Error closing pool:', closeErr);
      }
    }
  }
}

async function updateStatus(statusId, content, userId) {
  let pool;
  try {
    pool = await sql.connect(config);
    const result = await pool.request()
      .input('statusId', sql.Int, statusId)
      .input('content', sql.NVarChar, content)
      .input('userId', sql.Int, userId)
      .query(`
        UPDATE statuses 
        SET content = @content, updated_at = GETDATE()
        WHERE status_id = @statusId AND user_id = @userId
      `);
    
    if (result.rowsAffected[0] === 0) {
      throw new Error('Status not found or unauthorized');
    }
    
    return await getStatusById(statusId);
  } catch (err) {
    throw err;
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeErr) {
        console.error('Error closing pool:', closeErr);
      }
    }
  }
}

async function deleteStatus(statusId, userId) {
  let pool;
  try {
    pool = await sql.connect(config);
    const result = await pool.request()
      .input('statusId', sql.Int, statusId)
      .input('userId', sql.Int, userId)
      .query(`
        DELETE FROM statuses 
        WHERE status_id = @statusId AND user_id = @userId
      `);
    
    if (result.rowsAffected[0] === 0) {
      throw new Error('Status not found or unauthorized');
    }
    
    return result;
  } catch (err) {
    throw err;
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeErr) {
        console.error('Error closing pool:', closeErr);
      }
    }
  }
}

async function getFeed(userId, limit = 20, offset = 0) {
  try {
    await sql.connect(config);
    // Get statuses from friends and the user themselves
    const result = await sql.query`
      SELECT s.*, u.username, u.email
      FROM statuses s
      JOIN users u ON s.user_id = u.user_id
      WHERE s.user_id IN (
        SELECT friend_user_id FROM friendships 
        WHERE user_id = ${userId} AND status = 'accepted'
        UNION
        SELECT user_id FROM friendships 
        WHERE friend_user_id = ${userId} AND status = 'accepted'
        UNION
        SELECT ${userId}
      )
      ORDER BY s.created_at DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `;
    return result.recordset;
  } catch (err) {
    throw err;
  }
}

async function getRecentStatuses(limit = 50) {
  try {
    await sql.connect(config);
    const result = await sql.query`
      SELECT s.*, u.username, u.email
      FROM statuses s
      JOIN users u ON s.user_id = u.user_id
      ORDER BY s.created_at DESC
      OFFSET 0 ROWS FETCH NEXT ${limit} ROWS ONLY
    `;
    return result.recordset;
  } catch (err) {
    throw err;
  }
}

async function searchStatuses(query, limit = 20) {
  try {
    await sql.connect(config);
    const result = await sql.query`
      SELECT s.*, u.username, u.email
      FROM statuses s
      JOIN users u ON s.user_id = u.user_id
      WHERE s.content LIKE ${'%' + query + '%'}
      ORDER BY s.created_at DESC
      OFFSET 0 ROWS FETCH NEXT ${limit} ROWS ONLY
    `;
    return result.recordset;
  } catch (err) {
    throw err;
  }
}

async function getStatusCount(userId) {
  try {
    await sql.connect(config);
    const result = await sql.query`
      SELECT COUNT(*) as count FROM statuses WHERE user_id = ${userId}
    `;
    return result.recordset[0].count;
  } catch (err) {
    throw err;
  }
}

module.exports = {
  createStatus,
  getStatusesByUserId,
  getStatusById,
  updateStatus,
  deleteStatus,
  getFeed,
  getRecentStatuses,
  searchStatuses,
  getStatusCount,
};
