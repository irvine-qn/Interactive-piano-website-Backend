const express = require("express");
const sheetsController = require("./sheets.controller");
const { requireAuth, optionalAuth } = require("../../common/middlewares/auth.middleware");

const router = express.Router();

router.get("/sheets", optionalAuth, sheetsController.getSheets);
// Phải khai báo trước /sheets/:id, nếu không "tags" và "liked" sẽ bị hiểu là một id
router.get("/sheets/tags", sheetsController.getTags);
router.get("/sheets/liked", requireAuth, sheetsController.getLikedSheets);
router.get("/sheets/:id", optionalAuth, sheetsController.getSheet);
router.get("/sheets/:id/score", sheetsController.getScore);
router.post("/sheets/:id/view", sheetsController.postView);
router.post("/sheets/:id/like", requireAuth, sheetsController.postLike);

module.exports = router;
