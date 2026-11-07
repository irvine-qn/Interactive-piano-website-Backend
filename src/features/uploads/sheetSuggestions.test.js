const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { suggestTitle, estimateDifficulty } = require("./sheetSuggestions");

const SHEETS_DIR = path.join(__dirname, "../../data/sheets");
const catalog = JSON.parse(fs.readFileSync(path.join(SHEETS_DIR, "catalog.json"), "utf8"));
const sampleNotes = (id) => JSON.parse(fs.readFileSync(path.join(SHEETS_DIR, `${id}.json`), "utf8")).notes;

test("tên bài gợi ý từ tên file", () => {
  assert.equal(suggestTitle("fur-elise.mid"), "Fur Elise");
  assert.equal(suggestTitle("MerryChristmasMr.Lawrence.mid"), "Merry Christmas Mr Lawrence");
  assert.equal(suggestTitle("rivers_flow__in-you.MIDI"), "Rivers Flow In You");
  assert.equal(suggestTitle("bài ca mùa xuân.mid"), "Bài Ca Mùa Xuân");
  // Người dùng đã tự viết hoa thì giữ nguyên
  assert.equal(suggestTitle("River Flows in You (Yiruma).mid"), "River Flows in You (Yiruma)");
  assert.equal(suggestTitle(".mid"), "Untitled");
  assert.equal(suggestTitle(undefined), "Untitled");
  assert.equal(suggestTitle(`${"a".repeat(150)}.mid`).length, 100);
});

test("độ khó gợi ý khớp 8/9 bài mẫu, mọi bài EASY đều đúng", () => {
  const results = catalog.map((entry) => ({ id: entry.id, expected: entry.difficulty, actual: estimateDifficulty(sampleNotes(entry.id)) }));
  const wrong = results.filter((r) => r.expected !== r.actual);
  // flower-dance (HARD) không tách được khỏi các bài MEDIUM bằng mật độ nốt (xem comment trong sheetSuggestions.js)
  assert.deepEqual(wrong, [{ id: "flower-dance", expected: "HARD", actual: "MEDIUM" }]);
});

test("bài dày nốt được gợi ý HARD / EXPERT", () => {
  const notesAt = (perSecond, seconds, chord = 1) =>
    Array.from({ length: perSecond * seconds }, (_, i) => Math.floor(i / chord))
      .map((press, i) => ({ midi: 60 + (i % chord), time: (press * chord) / perSecond, duration: 0.1, hand: "right" }));
  assert.equal(estimateDifficulty(notesAt(3, 20)), "EASY");
  assert.equal(estimateDifficulty(notesAt(8, 20)), "HARD"); // 8 lần nhấn mỗi giây
  assert.equal(estimateDifficulty(notesAt(12, 20)), "EXPERT"); // 12 lần nhấn mỗi giây
  assert.equal(estimateDifficulty([]), "EASY");
});
