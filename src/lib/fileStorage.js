// Lưu file MIDI gốc của bài upload. Mọi chỗ đọc/ghi file đi qua module này để đổi nơi lưu
// (local: PostgreSQL, deploy: Cloud dùng chung với ảnh avatar - WBS U-BE-12) mà không phải sửa API.
// Chọn nơi lưu bằng FILE_STORAGE trong .env. Hiện có: "postgres".
//
//   save(sheetId, data, { originalName, db })   -> lưu (ghi đè nếu đã có)
//   read(sheetId, { db })                         -> { data: Buffer, originalName, size } | null
//   remove(sheetId, { db })                       -> xoá (không có thì thôi)
//
// `db` (tuỳ chọn): Prisma transaction client, để lưu file cùng transaction với bài
// (lưu file lỗi thì không còn bài thiếu file). Driver Cloud sẽ bỏ qua `db`.
const prisma = require("./prisma");
const { FILE_STORAGE } = require("../config/env");

const MAX_NAME_LENGTH = 255; // khớp cột sheet_files.original_name

const toBuffer = (data) => {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);
  throw new TypeError("fileStorage: data must be a Buffer");
};

// Giữ phần cuối tên file (có đuôi .mid) nếu tên quá dài
const toStoredName = (name) => String(name || "file.mid").slice(-MAX_NAME_LENGTH);

const postgresStorage = {
  save: async (sheetId, data, { originalName, db = prisma } = {}) => {
    const buffer = toBuffer(data);
    const file = { data: buffer, originalName: toStoredName(originalName), size: buffer.length };
    await db.sheetFile.upsert({ where: { sheetId }, create: { sheetId, ...file }, update: file });
  },

  read: async (sheetId, { db = prisma } = {}) => {
    const file = await db.sheetFile.findUnique({ where: { sheetId } });
    // Prisma trả cột Bytes dạng Uint8Array
    return file && { data: Buffer.from(file.data), originalName: file.originalName, size: file.size };
  },

  remove: async (sheetId, { db = prisma } = {}) => {
    await db.sheetFile.deleteMany({ where: { sheetId } });
  },
};

const DRIVERS = { postgres: postgresStorage };

// Báo lỗi ngay khi server khởi động nếu FILE_STORAGE sai, không đợi tới lúc có người upload
const createFileStorage = (driver) => {
  const storage = DRIVERS[driver];
  if (!storage) {
    throw new Error(`FILE_STORAGE "${driver}" is not supported. Available: ${Object.keys(DRIVERS).join(", ")}`);
  }
  return storage;
};

module.exports = { ...createFileStorage(FILE_STORAGE), createFileStorage };
