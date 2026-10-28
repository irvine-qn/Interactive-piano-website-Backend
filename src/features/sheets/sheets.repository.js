const prisma = require("../../lib/prisma");

// Các cột trả về ở danh sách: không lấy `notes` (nặng)
const SUMMARY_SELECT = {
  id: true,
  title: true,
  subtitle: true,
  composer: true,
  difficulty: true,
  tags: true,
  bpm: true,
  timeSignature: true,
  keySignature: true,
  durationSec: true,
  noteCount: true,
  views: true,
  likes: true,
  coverColor: true,
  createdAt: true,
};

const ORDER_BY = {
  popular: { views: "desc" },
  likes: { likes: "desc" },
  newest: { createdAt: "desc" },
  title: { title: "asc" },
};

const buildWhere = ({ q, difficulty, tag }) => ({
  ...(q && {
    OR: [
      { title: { contains: q, mode: "insensitive" } },
      { composer: { contains: q, mode: "insensitive" } },
    ],
  }),
  ...(difficulty && { difficulty }),
  ...(tag && { tags: { has: tag } }),
});

const findMany = async ({ q, difficulty, tag, sort, page, pageSize }) => {
  const where = buildWhere({ q, difficulty, tag });
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

// Prisma không group được theo phần tử của mảng nên dùng SQL: tách mảng tags thành từng dòng rồi đếm
const countTags = () =>
  prisma.$queryRaw`
    SELECT tag AS name, COUNT(*)::int AS count
    FROM sheets, unnest(tags) AS tag
    GROUP BY tag
    ORDER BY count DESC, name ASC
  `;

module.exports = { findMany, findById, countTags };
