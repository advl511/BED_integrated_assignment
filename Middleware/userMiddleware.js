//middleware to validate user input for signup and login
function validateSignup(req, res, next) {
  const { username, email, password, confirmPassword } = req.body;
  if (!username || !email || !password || !confirmPassword)
    return res.status(400).json({ error: 'All fields are required' });
  if (password !== confirmPassword)
    return res.status(400).json({ error: 'Passwords do not match' });
  next();
}

function validateLogin(req, res, next) {
  const { username, email, password } = req.body;
  
  // Accept either username or email
  if ((!username && !email) || !password) {
    return res.status(400).json({ error: 'Username/email and password are required' });
  }
  
  next();
}

module.exports = {
  validateSignup,
  validateLogin
};