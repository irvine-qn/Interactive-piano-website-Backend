const prisma = require("../../lib/prisma");
const fileStorage = require("../../lib/fileStorage");
const { SUMMARY_SELECT } = require("../sheets/sheets.repository");

// Các id đang dùng có cùng tiền tố (để chọn base, base-2, base-3...)
const findIdsStartingWith = async (base) =>
  (await prisma.sheet.findMany({ where: { id: { startsWith: base } }, select: { id: true } })).map((row) => row.id);

// Lưu bài + file MIDI gốc trong 1 transaction: lưu file lỗi thì không còn bài thiếu file.
// Id đã có -> Prisma lỗi P2002 (service chọn id khác rồi thử lại).
const createSheet = (data, { buffer, originalname }) =>
  prisma.$transaction(async (tx) => {
    const sheet = await tx.sheet.create({
      data,
      select: { ...SUMMARY_SELECT, visibility: true, uploaderId: true },
    });
    await fileStorage.save(sheet.id, buffer, { originalName: originalname, db: tx });
    return sheet;
  });

// Có tài khoản này không (GET /users/:id/sheets). Không dùng users.repository.js vì đó là phần Auth của Quỳnh.
const userExists = async (id) => Boolean(await prisma.user.findUnique({ where: { id }, select: { id: true } }));

// ===== Sửa / xoá bài của mình (U-BE-10) =====
// Điều kiện "của tôi" nằm ngay trong câu UPDATE / DELETE (uploaderId = userId): không có khe hở giữa kiểm tra và ghi.
// userId luôn là số thật (requireAuth), bài mẫu có uploaderId null nên không bao giờ khớp.
// Không khớp -> null (service trả 404).
const updateOwnSheet = (id, userId, data) =>
  prisma.$transaction(async (tx) => {
    const { count } = await tx.sheet.updateMany({ where: { id, uploaderId: userId }, data });
    if (!count) return null;
    return tx.sheet.findUnique({
      where: { id },
      select: { ...SUMMARY_SELECT, likedBy: { where: { userId }, select: { userId: true } } },
    });
  });

// Xoá file gốc (qua fileStorage) + bài; lượt thích và sheet_files xoá theo (onDelete: Cascade)
const deleteOwnSheet = (id, userId) =>
  prisma.$transaction(async (tx) => {
    const own = await tx.sheet.findFirst({ where: { id, uploaderId: userId }, select: { id: true } });
    if (!own) return false;
    await fileStorage.remove(id, { db: tx });
    const { count } = await tx.sheet.deleteMany({ where: { id, uploaderId: userId } });
    return count > 0;
  });

module.exports = { findIdsStartingWith, createSheet, userExists, updateOwnSheet, deleteOwnSheet };
