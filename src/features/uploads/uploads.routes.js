const express = require("express");
const uploadsController = require("./uploads.controller");
const { requireAuth, optionalAuth } = require("../../common/middlewares/auth.middleware");
const { receiveMidiFile } = require("../../common/middlewares/upload.middleware");

const router = express.Router();

// requireAuth đứng trước để chặn người chưa đăng nhập trước khi đọc file
router.post("/uploads/midi/analyze", requireAuth, receiveMidiFile, uploadsController.analyzeMidi);
// Tạo bài từ file (bước 2). Nằm ở đây, không ở sheets.routes.js, vì cần receiveMidiFile và engine upload
router.post("/sheets", requireAuth, receiveMidiFile, uploadsController.createSheet);
// Bài đã upload (U-BE-09). Đặt ở đây, không ở features/users (phần Auth / profile của Quỳnh).
// /users/me/sheets phải khai báo trước /users/:id/sheets, nếu không "me" sẽ bị hiểu là một id
router.get("/users/me/sheets", requireAuth, uploadsController.getMySheets);
router.get("/users/:id/sheets", optionalAuth, uploadsController.getUserSheets);

module.exports = router;
