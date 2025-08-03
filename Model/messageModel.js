const { sql, config } = require("../db");

async function getAllMessages() {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query("SELECT * FROM Messages ORDER BY timestamp ASC");
    console.log("DB getAllMessages result:", result.recordset);
    return result.recordset;
  } catch (err) {
    console.error("DB error in getAllMessages:", err);
    throw err;
  }
}


async function createMessage(sender, content, translated = "") {
  const pool = await sql.connect(config);
  await pool.request()
  .input("sender", sql.NVarChar(255), sender)
  .input("content", sql.NVarChar(sql.MAX), content)
  .input("translated", sql.NVarChar(sql.MAX), translated)
  .query("INSERT INTO Messages (sender, content, translated) VALUES (@sender, @content, @translated)"); }


async function updateMessage(id, content, translated = "") {
  const pool = await sql.connect(config);
  await pool.request()
    .input("id", sql.Int, id)
    .input("content", sql.NVarChar(sql.MAX), content)
    .input("translated", sql.NVarChar(sql.MAX), translated)
    .query("UPDATE Messages SET content = @content, translated = @translated WHERE id = @id");
}


async function deleteMessage(id) {
  const pool = await sql.connect(config);
  await pool.request()
    .input("id", sql.Int, id)
    .query("DELETE FROM Messages WHERE id = @id");
}

module.exports = {
  getAllMessages,
  createMessage,
  updateMessage,
  deleteMessage,
};
