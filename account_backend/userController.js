const bcrypt = require('bcrypt');
const userModel = require('./userModel.js');

async function registerUser(req, res) {
  try {
    const { username, email, password } = req.body;
    
    // Check if email already exists
    const existingEmail = await userModel.findUserByEmail(email);
    if (existingEmail) return res.status(400).json({ error: 'Email already exists' });
    
    // Check if username already exists
    const existingUsername = await userModel.findUserByUsername(username);
    if (existingUsername) return res.status(400).json({ error: 'Username already exists' });

    const newUser = {
      username: username,
      email,
      password,
      phone_number: 'N/A',
      race: 'N/A',
      age: 0,
      first_name: 'N/A',
      last_name: 'N/A',
      gender: 'Prefer not to say',
      date_of_birth: '2000-01-01',
      nationality: 'N/A'
    };
    await userModel.createUser(newUser);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function loginUser(req, res) {
  try {
    const { username, email, password } = req.body;
    
    // Accept either username or email for login
    const loginIdentifier = username || email;
    
    // Finds user by username if provided
    let user = null;
    if (username) {
      user = await userModel.findUserByUsername(username);
    }
    
    // If not found by username then try by email
    if (!user && email) {
      user = await userModel.findUserByEmail(email);
    }
    
    // If not found again try to find by email using the loginIdentifier
    if (!user) {
      user = await userModel.findUserByEmail(loginIdentifier);
    }
    
    // If still not found try to find by username using the loginIdentifier
    if (!user) {
      user = await userModel.findUserByUsername(loginIdentifier);
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.status(200).json({ 
      message: 'Login successful', 
      user_id: user.user_id,
      username: user.username,
      email: user.email
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function checkEmailExists(req, res) {
  try {
    const { email } = req.params;
    const user = await userModel.findUserByEmail(email);
    res.json({ exists: !!user });
  } catch (err) {
    console.error('Check email error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function checkUsernameExists(req, res) {
  try {
    const { username } = req.params;
    const user = await userModel.findUserByUsername(username);
    res.json({ exists: !!user });
  } catch (err) {
    console.error('Check username error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  registerUser,
  loginUser,
  checkEmailExists,
  checkUsernameExists,
};