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

module.exports = { findIdsStartingWith, createSheet, userExists };
