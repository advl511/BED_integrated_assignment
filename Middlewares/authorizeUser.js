const jwt = require("jsonwebtoken");
const util = require("util");

const verify = util.promisify(jwt.verify);

async function authorizeUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Token required" });

  const token = authHeader.split(" ")[1];
  try {
    const user = await verify(token, process.env.JWT_SECRET);
    req.user = user;
    next();
  } catch (err) {
    res.status(403).json({ error: "Invalid token" });
  }
}

module.exports = authorizeUser;
