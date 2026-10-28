const prisma = require("../../lib/prisma");

// Các cột trả về ở danh sách: không lấy `notes` (nặng) và các cột chưa có trong contract
const SUMMARY_SELECT = {
  id: true,
  title: true,
  composer: true,
  difficulty: true,
  tags: true,
  bpm: true,
  timeSignature: true,
  durationSec: true,
  noteCount: true,
  createdAt: true,
};

const ORDER_BY = {
  newest: { createdAt: "desc" },
  title: { title: "asc" },
};

const buildWhere = ({ q, difficulty }) => ({
  ...(q && {
    OR: [
      { title: { contains: q, mode: "insensitive" } },
      { composer: { contains: q, mode: "insensitive" } },
    ],
  }),
  ...(difficulty && { difficulty }),
});

const findMany = async ({ q, difficulty, sort, page, pageSize }) => {
  const where = buildWhere({ q, difficulty });
  const [items, total] = await prisma.$transaction([
    prisma.sheet.findMany({
      where,
      select: SUMMARY_SELECT,
      orderBy: [ORDER_BY[sort], { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.sheet.count({ where }),
  ]);
  return { items, total };
};

const findById = (id) =>
  prisma.sheet.findUnique({
    where: { id },
    select: { ...SUMMARY_SELECT, notes: true },
  });

module.exports = { findMany, findById };
