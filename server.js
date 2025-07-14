const express = require("express");
const cors = require("cors");
const sql = require("mssql");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const messageController = require("./Controller/messageController");
const translateController = require("./Controller/translateController");


const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));


// Translation route (protected or unprotected — choose ONE)
app.post("/api/translate", translateController.translateText);


// Message routes
app.get("/api/messages", messageController.getAllMessages);
app.post("/api/messages", messageController.createMessage);
app.delete("/api/messages/:id", messageController.deleteMessage);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

process.on("SIGINT", async () => {
  console.log("Gracefully shutting down");
  await sql.close();
  console.log("Database connections closed");
  process.exit(0);
});
