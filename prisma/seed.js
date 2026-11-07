// Đưa các bài trong src/data/sheets/catalog.json (kèm file nốt <id>.json) vào bảng sheets.
// Chạy: npm run db:seed. Chạy lại nhiều lần không bị trùng (upsert theo id).
const fs = require("fs");
const path = require("path");
const prisma = require("../src/lib/prisma");

const SHEETS_DIR = path.join(__dirname, "../src/data/sheets");

const readJson = (fileName) => JSON.parse(fs.readFileSync(path.join(SHEETS_DIR, fileName), "utf8"));

const toSheetData = (entry) => {
  const { metadata, notes } = readJson(`${entry.id}.json`);
  const songEnd = notes.reduce((max, n) => Math.max(max, n.time + n.duration), 0);

  return {
    title: entry.title,
    subtitle: entry.subtitle,
    composer: entry.composer,
    difficulty: entry.difficulty,
    tags: entry.tags,
    bpm: metadata.bpm,
    timeSignature: metadata.timeSignature,
    keySignature: metadata.keySignature,
    durationSec: Math.ceil(songEnd),
    noteCount: notes.length,
    coverColor: entry.coverColor,
    createdAt: new Date(entry.createdAt),
    notes,
  };
};

const main = async () => {
  const catalog = readJson("catalog.json");

  for (const entry of catalog) {
    // Id đã thuộc về bài người dùng upload (vd thêm bài mẫu mới trùng tên bài đã upload): không ghi đè
    const existing = await prisma.sheet.findUnique({ where: { id: entry.id }, select: { uploaderId: true } });
    if (existing?.uploaderId) {
      console.warn(`✘ ${entry.id}: id đã là bài người dùng upload, bỏ qua. Đổi id trong catalog.json.`);
      continue;
    }
    const data = toSheetData(entry);
    await prisma.sheet.upsert({
      where: { id: entry.id },
      create: { id: entry.id, ...data },
      update: data,
    });
    console.log(`✔ ${entry.id} (${data.noteCount} nốt)`);
  }

  console.log(`Đã seed ${catalog.length} bài.`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
