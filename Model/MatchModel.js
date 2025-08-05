const sql = require('mssql');
const db = require('../Middleware/db');

const getQueueCount = async () => {
    const result = await db.query(`SELECT COUNT(*) AS count FROM MatchQueue WHERE IsMatched = 0`);
    return result.recordset[0].count;
};

const isUserInQueue = async (userID) => {
    const result = await db.query(`SELECT * FROM MatchQueue WHERE UserID = @userID AND IsMatched = 0`, {
        userID: { type: sql.Int, value: userID }
    });
    return result.recordset.length > 0;
};

const addToQueue = async (userID) => {
    await db.query(`INSERT INTO MatchQueue (UserID) VALUES (@userID)`, {
        userID: { type: sql.Int, value: userID }
    });
};

const removeFromQueue = async (userID) => {
    await db.query(`DELETE FROM MatchQueue WHERE UserID = @userID AND IsMatched = 0`, {
        userID: { type: sql.Int, value: userID }
    });
};

const tryMatchUsers = async () => {
    const result = await db.query(`
        SELECT TOP 2 * FROM MatchQueue WHERE IsMatched = 0 ORDER BY JoinTime ASC
    `);

    if (result.recordset.length === 2) {
        const [user1, user2] = result.recordset;
        await db.query(`
            BEGIN TRANSACTION;

            UPDATE MatchQueue SET IsMatched = 1 WHERE QueueID IN (@q1, @q2);

            INSERT INTO Matches (User1ID, User2ID)
            VALUES (@u1, @u2);

            COMMIT;
        `, {
            q1: { type: sql.Int, value: user1.QueueID },
            q2: { type: sql.Int, value: user2.QueueID },
            u1: { type: sql.Int, value: Math.min(user1.UserID, user2.UserID) },
            u2: { type: sql.Int, value: Math.max(user1.UserID, user2.UserID) },
        });

        return { matched: true, users: [user1.UserID, user2.UserID] };
    }

    return { matched: false };
};

module.exports = {
    getQueueCount,
    isUserInQueue,
    addToQueue,
    removeFromQueue,
    tryMatchUsers
};
