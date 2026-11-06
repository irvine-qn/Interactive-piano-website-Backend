const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { parseMidi, describeTracks, pickDefaultTracks, convertMidi } = require("./midiToSheet");

const SHEETS_DIR = path.join(__dirname, "../../data/sheets");
const catalog = JSON.parse(fs.readFileSync(path.join(SHEETS_DIR, "catalog.json"), "utf8"));
const readSample = (entry) => parseMidi(fs.readFileSync(path.join(SHEETS_DIR, entry.midiFile)));

// Hồi quy: sửa engine không được làm đổi nốt của 9 bài mẫu đang có trong DB
test("9 bài mẫu chuyển ra đúng như file JSON đã lưu", () => {
  catalog.forEach((entry) => {
    const expected = JSON.parse(fs.readFileSync(path.join(SHEETS_DIR, `${entry.id}.json`), "utf8"));
    assert.deepEqual(convertMidi(readSample(entry), { tracks: entry.tracks }), expected, entry.id);
  });
});

test("tự chọn track: bỏ track trống và track không phải piano", () => {
  const torinouta = readSample(catalog.find((entry) => entry.id === "tori-no-uta"));
  assert.deepEqual(pickDefaultTracks(describeTracks(torinouta)), [4, 5]);
});

test("báo lỗi khi chọn track không tồn tại hoặc không có nốt", () => {
  const furElise = readSample(catalog.find((entry) => entry.id === "fur-elise"));
  assert.throws(() => convertMidi(furElise, { tracks: [99] }), /Track 99/);
});
