const express = require("express");
const sheetsController = require("./sheets.controller");
const { requireAuth, optionalAuth } = require("../../common/middlewares/auth.middleware");

const router = express.Router();

router.get("/sheets", optionalAuth, sheetsController.getSheets);
// Phải khai báo trước /sheets/:id, nếu không "tags" sẽ bị hiểu là một id
router.get("/sheets/tags", sheetsController.getTags);
router.get("/sheets/:id", optionalAuth, sheetsController.getSheet);
// optionalAuth: người upload xem được bài PRIVATE của mình (U-BE-08)
router.get("/sheets/:id/score", optionalAuth, sheetsController.getScore);
router.post("/sheets/:id/view", optionalAuth, sheetsController.postView);
router.post("/sheets/:id/like", requireAuth, sheetsController.postLike);

module.exports = router;
