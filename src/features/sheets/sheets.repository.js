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
  // Feature upload: quyền xem + người upload (null = bài mẫu)
  visibility: true,
  uploaderId: true,
  uploader: { select: { id: true, username: true, displayName: true } },
};

// Bài người này được xem: PUBLIC, hoặc PRIVATE do chính họ upload.
// Khách (userId rỗng) chỉ PUBLIC. KHÔNG viết { OR: [..., { uploaderId: userId }] } khi userId có thể undefined:
// Prisma coi `uploaderId: undefined` là không lọc -> lộ mọi bài PRIVATE.
const visibleTo = (userId) =>
  userId ? { OR: [{ visibility: "PUBLIC" }, { uploaderId: userId }] } : { visibility: "PUBLIC" };

const ORDER_BY = {
  popular: { views: "desc" },
  likes: { likes: "desc" },
  newest: { createdAt: "desc" },
  title: { title: "asc" },
};

// Prisma đưa `contains` vào ILIKE mà không escape, nên "%" và "_" sẽ thành ký tự đại diện
const escapeLike = (value) => value.replace(/[\\%_]/g, "\\$&");

// Library chỉ liệt kê bài PUBLIC (bài PRIVATE của tôi xem ở "bài đã upload", U-BE-09)
const buildWhere = ({ q, difficulty, tag }) => ({
  visibility: "PUBLIC",
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

// Dòng DB -> sheet trả cho FE: likedByMe, isMine, uploader { id, displayName } (chưa đặt tên hiển thị thì dùng username)
const toSheet = ({ likedBy, uploader, ...sheet }, userId) => ({
  ...sheet,
  uploader: uploader && { id: uploader.id, displayName: uploader.displayName || uploader.username },
  isMine: Boolean(userId) && sheet.uploaderId === userId,
  likedByMe: Boolean(likedBy?.length),
});

const findMany = async ({ q, difficulty, tag, sort, page, pageSize }, userId) => {
  const where = buildWhere({ q, difficulty, tag });
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
  return { items: items.map((item) => toSheet(item, userId)), total };
};

// Bài không có hoặc là bài PRIVATE của người khác -> null (service trả 404, không để lộ là bài có tồn tại)
const findById = async (id, userId) => {
  const sheet = await prisma.sheet.findFirst({
    where: { id, ...visibleTo(userId) },
    select: { ...withLikedByMe(userId), notes: true },
  });
  return sheet && toSheet(sheet, userId);
};

// Prisma không group được theo phần tử của mảng nên dùng SQL: tách mảng tags thành từng dòng rồi đếm
// Chỉ đếm bài PUBLIC: tag của bài PRIVATE không hiện ở bộ lọc Library
const countTags = () =>
  prisma.$queryRaw`
    SELECT tag AS name, COUNT(*)::int AS count
    FROM sheets, unnest(tags) AS tag
    WHERE sheets.visibility = 'PUBLIC'
    GROUP BY tag
    ORDER BY count DESC, name ASC
  `;

// Tăng views ngay trong câu UPDATE (atomic, nhiều request cùng lúc không bị mất lượt).
// Trả null nếu không có bài / không được xem (updateMany không khớp dòng nào).
const incrementViews = (id, userId) =>
  prisma.$transaction(async (tx) => {
    const { count } = await tx.sheet.updateMany({
      where: { id, ...visibleTo(userId) },
      data: { views: { increment: 1 } },
    });
    if (!count) return null;
    return tx.sheet.findUnique({ where: { id }, select: { views: true } });
  });

const toggleLike = (sheetId, userId) =>
  prisma.$transaction(async (tx) => {
    const sheet = await tx.sheet.findFirst({ where: { id: sheetId, ...visibleTo(userId) }, select: { id: true } });
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

module.exports = { SUMMARY_SELECT, visibleTo, toSheet, findMany, findById, countTags, incrementViews, toggleLike };
