const express = require("express");
const sheetsController = require("./sheets.controller");

const router = express.Router();

router.get("/sheets", sheetsController.getSheets);
router.get("/sheets/:id", sheetsController.getSheet);

module.exports = router;
