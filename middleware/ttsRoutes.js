const express = require("express");
const router = express.Router();
const translationController = require("../Controller/translationController");


router.post("/translate", translationController.createTranslation);
router.get("/history", translationController.getAllTranslations);
router.get("/history/:id", translationController.getTranslationById);
router.put("/history/:id", translationController.updateTranslation);
router.delete("/history/:id", translationController.deleteTranslation);

module.exports = router;
