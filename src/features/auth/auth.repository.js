const prisma = require("../../lib/prisma");

// Moi nguoi dung chi giu mot token con hieu luc cho moi loai
const replaceToken = ({ userId, type, tokenHash, expiresAt }) =>
  prisma.$transaction([
    prisma.authToken.deleteMany({ where: { userId, type, usedAt: null } }),
    prisma.authToken.create({ data: { userId, type, tokenHash, expiresAt } }),
  ]);

const findValidToken = (tokenHash, type) =>
  prisma.authToken.findFirst({
    where: { tokenHash, type, usedAt: null, expiresAt: { gt: new Date() } },
  });

// Danh dau token da dung va cap nhat nguoi dung trong cung mot giao dich, token chi dung duoc mot lan
const useToken = (token, userData) =>
  prisma.$transaction(async (tx) => {
    const { count } = await tx.authToken.updateMany({
      where: { id: token.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (count === 0) return false;
    await tx.user.update({ where: { id: token.userId }, data: userData });
    return true;
  });

module.exports = { replaceToken, findValidToken, useToken };
