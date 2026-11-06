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

// Prisma đưa `contains` vào ILIKE mà không escape, nên "%" và "_" sẽ thành ký tự đại diện
const escapeLike = (value) => value.replace(/[\\%_]/g, "\\$&");

const buildWhere = ({ q, difficulty, tag, likedByUserId }) => ({
  ...(likedByUserId && { likedBy: { some: { userId: likedByUserId } } }),
  ...(q && {
    OR: [
      { title: { contains: escapeLike(q), mode: "insensitive" } },
      { composer: { contains: escapeLike(q), mode: "insensitive" } },
    ],
  }),
  ...(difficulty && { difficulty }),
  ...(tag && { tags: { has: tag } }),
});

const withLikedByMe = (userId) => ({
  ...SUMMARY_SELECT,
  ...(userId && { likedBy: { where: { userId }, select: { userId: true } } }),
});

const toSheet = ({ likedBy, ...sheet }) => ({ ...sheet, likedByMe: Boolean(likedBy?.length) });

const findMany = async ({ q, difficulty, tag, likedByUserId, sort, page, pageSize }, userId) => {
  const where = buildWhere({ q, difficulty, tag, likedByUserId });
  const [items, total] = await prisma.$transaction([
    prisma.sheet.findMany({
      where,
      select: withLikedByMe(userId),
      orderBy: [ORDER_BY[sort], { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.sheet.count({ where }),
  ]);
  return { items: items.map(toSheet), total };
};

const findById = async (id, userId) => {
  const sheet = await prisma.sheet.findUnique({
    where: { id },
    select: { ...withLikedByMe(userId), notes: true },
  });
  return sheet && toSheet(sheet);
};

// Prisma không group được theo phần tử của mảng nên dùng SQL: tách mảng tags thành từng dòng rồi đếm
const countTags = () =>
  prisma.$queryRaw`
    SELECT tag AS name, COUNT(*)::int AS count
    FROM sheets, unnest(tags) AS tag
    GROUP BY tag
    ORDER BY count DESC, name ASC
  `;

// Tăng views ngay trong câu UPDATE (atomic, nhiều request cùng lúc không bị mất lượt).
// Trả null nếu không có bài (Prisma báo lỗi P2025 khi không tìm thấy bản ghi để update).
const incrementViews = async (id) => {
  try {
    return await prisma.sheet.update({
      where: { id },
      data: { views: { increment: 1 } },
      select: { views: true },
    });
  } catch (error) {
    if (error.code === "P2025") return null;
    throw error;
  }
};

const toggleLike = (sheetId, userId) =>
  prisma.$transaction(async (tx) => {
    const sheet = await tx.sheet.findUnique({ where: { id: sheetId }, select: { id: true } });
    if (!sheet) return null;

    const where = { userId, sheetId };
    const removed = await tx.sheetLike.deleteMany({ where });
    if (removed.count > 0) {
      const { likes } = await tx.sheet.update({
        where: { id: sheetId },
        data: { likes: { decrement: removed.count } },
        select: { likes: true },
      });
      return { liked: false, likes };
    }

    const added = await tx.sheetLike.createMany({ data: [where], skipDuplicates: true });
    const { likes } = await tx.sheet.update({
      where: { id: sheetId },
      data: { likes: { increment: added.count } },
      select: { likes: true },
    });
    return { liked: true, likes };
  });

const createPracticeSession = async (sheetId, userId, data) => {
  const sheet = await prisma.sheet.findUnique({ where: { id: sheetId }, select: { id: true } });
  if (!sheet) return null;
  return prisma.practiceSession.create({
    data: { ...data, sheetId, userId },
    select: { id: true, noteCount: true, durationSec: true },
  });
};

const findPracticeHistory = async (userId, { page, pageSize }) => {
  const where = { userId };
  const [items, total] = await prisma.$transaction([
    prisma.practiceSession.findMany({
      where,
      select: {
        id: true,
        sheetId: true,
        noteCount: true,
        durationSec: true,
        sheet: { select: { title: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.practiceSession.count({ where }),
  ]);
  return {
    items: items.map(({ sheet, ...session }) => ({ ...session, title: sheet.title })),
    total,
  };
};

module.exports = { createPracticeSession, findPracticeHistory, findMany, findById, countTags, incrementViews, toggleLike };
