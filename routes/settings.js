const express = require("express");
const router = express.Router();
const settingsController = require("../controller/settingsController");
const authorizeUser = require("../Middlewares/authorizeUser");

router.get("/", authorizeUser, settingsController.getSettings);
router.post("/", authorizeUser, settingsController.saveSettings);

module.exports = router;
