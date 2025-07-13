const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { sql, config } = require("../db");

async function registerUser(req, res) {
  const { username, password } = req.body;
  try {
    const pool = await sql.connect(config);
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.request()
      .input("username", sql.VarChar, username)
      .input("password", sql.VarChar, hashedPassword)
      .query("INSERT INTO Users (username, password) VALUES (@username, @password)");
    res.status(201).json({ message: "User registered" });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
}

async function login(req, res) {
  const { username, password } = req.body;
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input("username", sql.VarChar, username)
      .query("SELECT * FROM Users WHERE username = @username");

    const user = result.recordset[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.json({ token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
}

module.exports = {
  registerUser,
  login,
};
