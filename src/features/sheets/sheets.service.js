const ApiError = require("../../common/exceptions/ApiError");
const { NOTE_NAMES } = require("../../common/constants/sheet.constants");
const catalog = require("./sheets.catalog");

const noteNameToMidi = (name) => {
  const match = /^([A-G]#?)(-?\d+)$/.exec(name);
  if (!match) return null;
  return (Number(match[2]) + 1) * 12 + NOTE_NAMES.indexOf(match[1]);
};

// Đọc và chuẩn hoá một lần lúc khởi động: thêm midi, sắp xếp theo time, tính duration/noteCount
const sheets = new Map(
  catalog.map((entry) => {
    const raw = require(entry.dataFile);
    const notes = raw.notes
      .map((n) => ({
        midi: noteNameToMidi(n.name),
        name: n.name,
        time: n.time,
        duration: n.duration,
        velocity: n.velocity,
        hand: n.hand,
      }))
      .filter((n) => n.midi !== null)
      .sort((a, b) => a.time - b.time);

    const durationSec = notes.reduce((max, n) => Math.max(max, n.time + n.duration), 0);

    const summary = {
      id: entry.id,
      title: entry.title,
      composer: entry.composer,
      difficulty: entry.difficulty,
      tags: entry.tags,
      bpm: raw.metadata.bpm,
      timeSignature: raw.metadata.timeSignature,
      durationSec: Math.ceil(durationSec),
      noteCount: notes.length,
      createdAt: entry.createdAt,
    };
    return [entry.id, { summary, notes }];
  }),
);

const listSheets = ({ q, difficulty, sort, page, pageSize }) => {
  let items = [...sheets.values()].map((s) => s.summary);

  if (q) {
    items = items.filter((s) => `${s.title} ${s.composer}`.toLowerCase().includes(q));
  }
  if (difficulty) {
    items = items.filter((s) => s.difficulty === difficulty);
  }
  items.sort(
    sort === "title"
      ? (a, b) => a.title.localeCompare(b.title)
      : (a, b) => b.createdAt.localeCompare(a.createdAt),
  );

  const total = items.length;
  const start = (page - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

const getSheetById = (id) => {
  const sheet = sheets.get(id);
  if (!sheet) {
    throw new ApiError(404, "SHEET_NOT_FOUND", `Sheet "${id}" not found`);
  }
  return { ...sheet.summary, notes: sheet.notes };
};

module.exports = { listSheets, getSheetById };
