// Id (slug) của bài upload, tạo từ tên bài.
// PHẢI giống toSlug của FE (features/upload/utils/sheetDetails.js): bìa bài vẽ theo id, Preview ở /upload
// đoán id bằng toSlug để bìa xem trước giống bìa thật.

// "  Đêm Lao Xao (Piano)! " -> "dem-lao-xao-piano"; không còn chữ / số nào -> "untitled"
const toSlug = (title) =>
  String(title ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "untitled";

// Id trùng route cố định của /sheets (GET /sheets/tags) -> coi như đã có bài, chuyển sang "tags-2"
const RESERVED_IDS = new Set(["tags"]);

// Id đầu tiên còn trống: base, base-2, base-3...
const pickFreeId = (base, takenIds) => {
  const taken = new Set(takenIds);
  if (!taken.has(base) && !RESERVED_IDS.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const id = `${base}-${n}`;
    if (!taken.has(id)) return id;
  }
};

module.exports = { toSlug, pickFreeId, RESERVED_IDS };
