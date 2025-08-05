const sql = require('mssql');
require('dotenv').config();

const poolPromise = sql.connect({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT),
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
});

module.exports = {
  insertUserToQueue: async (userId) => {
    const pool = await poolPromise;
    return pool.request()
      .input('UserID', sql.Int, userId)
      .query(`INSERT INTO MatchQueue (UserID) VALUES (@UserID)`);
  },

  checkUserInQueue: async (userId) => {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`SELECT * FROM MatchQueue WHERE UserID = @UserID AND IsMatched = 0`);
    return result.recordset;
  },

  getNextAvailableUser: async (currentUserId) => {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('CurrentUserID', sql.Int, currentUserId)
      .query(`
        SELECT TOP 1 * FROM MatchQueue 
        WHERE IsMatched = 0 AND UserID != @CurrentUserID
        ORDER BY JoinTime ASC
      `);
    return result.recordset[0];
  },

  createMatch: async (user1Id, user2Id) => {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('User1ID', sql.Int, user1Id)
      .input('User2ID', sql.Int, user2Id)
      .query(`
        INSERT INTO Matches (User1ID, User2ID)
        OUTPUT INSERTED.MatchID
        VALUES (@User1ID, @User2ID)
      `);
    return result.recordset[0].MatchID;
  },

  markUsersMatched: async (matchId, user1Id, user2Id) => {
    const pool = await poolPromise;
    return pool.request()
      .input('MatchID', sql.Int, matchId)
      .input('User1ID', sql.Int, user1Id)
      .input('User2ID', sql.Int, user2Id)
      .query(`
        UPDATE MatchQueue
        SET IsMatched = 1, MatchID = @MatchID
        WHERE UserID IN (@User1ID, @User2ID)
      `);
  },

  removeUserFromQueue: async (userId) => {
    const pool = await poolPromise;
    return pool.request()
      .input('UserID', sql.Int, userId)
      .query(`DELETE FROM MatchQueue WHERE UserID = @UserID AND IsMatched = 0`);
  }
};
