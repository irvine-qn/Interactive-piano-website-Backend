const express = require("express");
const uploadsController = require("./uploads.controller");
const { requireAuth } = require("../../common/middlewares/auth.middleware");
const { receiveMidiFile } = require("../../common/middlewares/upload.middleware");

const router = express.Router();

// requireAuth đứng trước để chặn người chưa đăng nhập trước khi đọc file
router.post("/uploads/midi/analyze", requireAuth, receiveMidiFile, uploadsController.analyzeMidi);

module.exports = router;
