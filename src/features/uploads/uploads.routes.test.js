// Test POST /api/v1/uploads/midi/analyze qua HTTP trên toàn bộ app (không cần database: analyze không lưu gì)
process.env.JWT_SECRET ||= "test-secret";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const jwt = require("jsonwebtoken");
const { Midi } = require("@tonejs/midi");
const app = require("../../app");
const { JWT_SECRET } = require("../../config/env");

const MIDI_DIR = path.join(__dirname, "../../data/sheets/midi");
const sample = (file) => fs.readFileSync(path.join(MIDI_DIR, file));
const token = jwt.sign({ sub: 1, username: "tester", role: "user" }, JWT_SECRET);

let url;
let server;
test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  url = `http://127.0.0.1:${server.address().port}/api/v1/uploads/midi/analyze`;
});
test.after(() => server.close());

const analyze = async (data, fileName, { auth = true, tracks } = {}) => {
  const form = new FormData();
  form.append("file", new Blob([data]), fileName);
  [].concat(tracks ?? []).forEach((value) => form.append("tracks", value));
  const res = await fetch(url, { method: "POST", body: form, headers: auth ? { Authorization: `Bearer ${token}` } : {} });
  return { status: res.status, body: await res.json() };
};
const buildMidi = (tracks) => {
  const midi = new Midi();
  tracks.forEach(({ program = 0, channel = 0, count = 20, midi: pitch = 60 }) => {
    const track = midi.addTrack();
    track.instrument.number = program;
    track.channel = channel;
    for (let i = 0; i < count; i += 1) track.addNote({ midi: pitch, time: i * 0.5, duration: 0.4 });
  });
  return Buffer.from(midi.toArray());
};

test("chưa đăng nhập báo 401 trước khi đọc file", async () => {
  const result = await analyze(sample("fur-elise.mid"), "fur-elise.mid", { auth: false });
  assert.deepEqual([result.status, result.body.error.code], [401, "UNAUTHORIZED"]);
});

test("Für Elise: thông tin bài, track gợi ý và độ khó", async () => {
  const { status, body } = await analyze(sample("fur-elise.mid"), "fur-elise.mid");
  assert.equal(status, 200);
  assert.deepEqual(
    { ...body, tracks: undefined },
    {
      fileName: "fur-elise.mid",
      suggestedTitle: "Fur Elise",
      suggestedDifficulty: "EASY",
      bpm: 120,
      timeSignature: [3, 4],
      keySignature: body.keySignature,
      durationSec: 33,
      noteCount: 104,
      tracks: undefined,
      suggestedTracks: [0, 1],
      selectedTracks: [0, 1],
      warnings: [],
    },
  );
  assert.deepEqual(body.tracks[0], {
    index: 0,
    name: "",
    instrument: "acoustic grand piano",
    program: 0,
    isPiano: true,
    isPercussion: false,
    noteCount: 86,
    minNote: "C4",
    maxNote: "F5",
    suggested: true,
  });
});

test("Golden Hour: chỉ liệt kê track có nốt, track nhỏ không được gợi ý", async () => {
  const { body } = await analyze(sample("golden-hour.mid"), "golden-hour.mid");
  assert.deepEqual(body.suggestedTracks, [0, 2]);
  assert.ok(body.tracks.every((t) => t.noteCount > 0));
  assert.equal(body.tracks.find((t) => t.index === 7).suggested, false);
  assert.equal(body.tracks.filter((t) => t.isPercussion).every((t) => !t.suggested), true);
});

test("gửi tracks thì số liệu và độ khó tính theo track đang chọn", async () => {
  const merry = sample("MerryChristmasMr.Lawrence.mid");
  const suggested = await analyze(merry, "merry.mid");
  assert.deepEqual([suggested.body.selectedTracks, suggested.body.noteCount, suggested.body.suggestedDifficulty], [[0], 840, "EASY"]);

  const withMusicBox = await analyze(merry, "merry.mid", { tracks: "0,1" });
  assert.deepEqual([withMusicBox.body.selectedTracks, withMusicBox.body.noteCount, withMusicBox.body.suggestedDifficulty], [[0, 1], 1775, "MEDIUM"]);
  // Gợi ý ban đầu không đổi
  assert.deepEqual(withMusicBox.body.suggestedTracks, [0]);
  // Nhiều trường tracks lặp lại cũng được
  assert.deepEqual((await analyze(merry, "merry.mid", { tracks: ["1", "0"] })).body.selectedTracks, [1, 0]);

  const bad = await analyze(merry, "merry.mid", { tracks: "0,abc" });
  assert.deepEqual([bad.status, bad.body.error.code], [422, "INVALID_TRACKS"]);
  const missing = await analyze(merry, "merry.mid", { tracks: "5" });
  assert.deepEqual([missing.status, missing.body.error.code], [422, "INVALID_TRACKS"]);
});

test("cảnh báo đổi tempo và không có track piano", async () => {
  const rivers = await analyze(sample("rivers-flow-in-you.mid"), "rivers-flow-in-you.mid");
  assert.deepEqual(rivers.body.warnings.map((w) => w.code), ["TEMPO_CHANGES"]);

  const strings = await analyze(buildMidi([{ program: 40, midi: 76 }, { program: 42, midi: 48 }]), "strings.mid");
  assert.equal(strings.status, 200);
  assert.deepEqual(strings.body.suggestedTracks, [0, 1]);
  assert.deepEqual(strings.body.warnings.map((w) => w.code), ["NO_PIANO_TRACK"]);
});

test("file lỗi trả đúng mã lỗi", async () => {
  const drums = await analyze(buildMidi([{ channel: 9, midi: 36 }]), "drums.mid");
  assert.deepEqual([drums.status, drums.body.error.code], [422, "NO_NOTES"]);

  const broken = Buffer.concat([Buffer.from("MThd"), Buffer.from([0, 0, 0, 6, 0, 1, 0, 2, 1, 224]), Buffer.from("MTrk\xff\xff")]);
  const damaged = await analyze(broken, "broken.mid");
  assert.deepEqual([damaged.status, damaged.body.error.code], [422, "INVALID_MIDI"]);

  const text = await analyze(Buffer.from("hello"), "notes.txt");
  assert.deepEqual([text.status, text.body.error.code], [415, "UNSUPPORTED_FILE"]);
});
