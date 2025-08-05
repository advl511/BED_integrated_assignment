module.exports = (req, res, next) => {
    const { userId, username } = req.body;
  
    if (!userId || !username) {
      return res.status(400).json({ message: 'Missing userId or username' });
    }
  
    // Optional: further validation (e.g., ID format, username length)
    next();
  };