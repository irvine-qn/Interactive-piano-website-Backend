const express = require("express");
const sheetsController = require("./sheets.controller");

const router = express.Router();

router.get("/sheets", sheetsController.getSheets);
// Phải khai báo trước /sheets/:id, nếu không "tags" sẽ bị hiểu là một id
router.get("/sheets/tags", sheetsController.getTags);
router.get("/sheets/:id", sheetsController.getSheet);
router.post("/sheets/:id/view", sheetsController.postView);

module.exports = router;
