const MatchModel = require('../Model/MatchModel');

const matchController = {
    getQueueStatus: async (req, res) => {
        try {
            const userID = parseInt(req.headers['x-user-id']);

            if (!userID || isNaN(userID)) {
                return res.status(401).json({ error: 'Unauthorized: Missing user ID' });
            }

            const count = await MatchModel.getQueueCount();
            res.json({ count });
        } catch (error) {
            console.error('Error getting queue status:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    toggleQueue: async (req, res) => {
        try {
            const userID = parseInt(req.body.userID);

            if (!userID || isNaN(userID)) {
                return res.status(401).json({ error: 'Unauthorized: Missing user ID' });
            }

            const inQueue = await MatchModel.isUserInQueue(userID);

            if (inQueue) {
                await MatchModel.removeFromQueue(userID);
                return res.json({ action: 'left' });
            } else {
                await MatchModel.addToQueue(userID);
                const match = await MatchModel.tryMatchUsers();

                if (match.matched && match.users.includes(userID)) {
                    return res.json({ action: 'matched', redirect: true });
                }

                return res.json({ action: 'joined' });
            }
        } catch (error) {
            console.error('Error toggling queue:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};

module.exports = matchController;
