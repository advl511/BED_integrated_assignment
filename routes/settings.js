const express = require("express");
const router = express.Router();
const settingsController = require("../Controller/settingsController");

router.get("/:userId", settingsController.getUserSettings);


router.post("/:userId", settingsController.upsertUserSettings);

module.exports = router;
