const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { Midi } = require("@tonejs/midi");
const {
  parseMidi,
  describeTracks,
  pickDefaultTracks,
  convertMidi,
  MIN_NOTE_SECONDS,
  MAX_NOTES,
  MAX_DURATION_SECONDS,
} = require("./midiToSheet");

const SHEETS_DIR = path.join(__dirname, "../../data/sheets");
const catalog = JSON.parse(fs.readFileSync(path.join(SHEETS_DIR, "catalog.json"), "utf8"));
const readSample = (id) => {
  const entry = catalog.find((item) => item.id === id);
  return parseMidi(fs.readFileSync(path.join(SHEETS_DIR, entry.midiFile)));
};

// Tạo file MIDI giả: tracks = [{ program?, channel?, notes: [{ midi, time, duration }] }]
const buildMidi = (tracks, { tempos = [] } = {}) => {
  const midi = new Midi();
  if (tempos.length) {
    midi.header.setTempo(tempos[0]);
    tempos.slice(1).forEach((bpm, index) => midi.header.tempos.push({ ticks: midi.header.ppq * 8 * (index + 1), bpm }));
    midi.header.update();
  }
  tracks.forEach(({ program = 0, channel = 0, notes }) => {
    const track = midi.addTrack();
    track.instrument.number = program;
    track.channel = channel;
    notes.forEach((note) => track.addNote(note));
  });
  return parseMidi(Buffer.from(midi.toArray()));
};
const notesAt = (count, midi = 60, step = 0.25) =>
  Array.from({ length: count }, (_, index) => ({ midi, time: index * step, duration: 0.2 }));
const isMidiError = (code) => (error) => error.status === 422 && error.code === code;

// Hồi quy: sửa engine không được làm đổi nốt của 9 bài mẫu đang có trong DB
test("9 bài mẫu chuyển ra đúng như file JSON đã lưu", () => {
  catalog.forEach((entry) => {
    const expected = JSON.parse(fs.readFileSync(path.join(SHEETS_DIR, `${entry.id}.json`), "utf8"));
    const { metadata, notes } = convertMidi(readSample(entry.id), { tracks: entry.tracks });
    assert.deepEqual({ metadata, notes }, expected, entry.id);
  });
});

test("file không phải MIDI hoặc bị hỏng báo INVALID_MIDI", () => {
  assert.throws(() => parseMidi(Buffer.from("hello, this is not a midi file")), isMidiError("INVALID_MIDI"));
  assert.throws(() => parseMidi(Buffer.from("MThd")), isMidiError("INVALID_MIDI"));
  const broken = Buffer.concat([Buffer.from("MThd"), Buffer.from([0, 0, 0, 6, 0, 1, 0, 2, 1, 224]), Buffer.from("MTrk\xff\xff")]);
  assert.throws(() => parseMidi(broken), isMidiError("INVALID_MIDI"));
  assert.throws(() => parseMidi("not a buffer"), isMidiError("INVALID_MIDI"));
});

test("track không có tên nhạc cụ vẫn đọc và chuyển được", () => {
  const flowerDance = readSample("flower-dance");
  const unnamed = describeTracks(flowerDance).filter((t) => t.noteCount > 0 && t.instrument === null);
  assert.ok(unnamed.length > 0);
  assert.ok(convertMidi(flowerDance, { tracks: [unnamed[0].index] }).notes.length > 0);
});

test("gợi ý track: chỉ track piano, bỏ track trống và track quá nhỏ", () => {
  assert.deepEqual(pickDefaultTracks(describeTracks(readSample("tori-no-uta"))), [4, 5]);
  // golden-hour: track 7 (electric piano, 19 nốt) quá nhỏ so với track 0 (2 017 nốt)
  assert.deepEqual(pickDefaultTracks(describeTracks(readSample("golden-hour"))), [0, 2]);

  const midi = buildMidi([
    { program: 0, notes: notesAt(100) },
    { program: 1, notes: notesAt(3, 72) },
    { program: 0, channel: 9, notes: notesAt(50, 36) },
    { program: 40, notes: notesAt(80, 76) },
  ]);
  assert.deepEqual(pickDefaultTracks(describeTracks(midi)), [0]);
});

test("không có track piano thì gợi ý mọi track không phải trống", () => {
  const midi = buildMidi([
    { program: 40, notes: notesAt(60, 76) },
    { program: 0, channel: 9, notes: notesAt(50, 36) },
    { program: 33, notes: notesAt(40, 40) },
  ]);
  assert.deepEqual(pickDefaultTracks(describeTracks(midi)), [0, 2]);
  assert.deepEqual(convertMidi(midi).metadata.tracks, [0, 2]);
});

test("nốt dài 0 giây được kéo dài và có cảnh báo", () => {
  const midi = buildMidi([{ notes: [{ midi: 60, time: 0, duration: 0 }, { midi: 62, time: 1, duration: 0.5 }] }]);
  const { notes, warnings } = convertMidi(midi);
  assert.equal(notes[0].duration, MIN_NOTE_SECONDS);
  assert.equal(notes[1].duration, 0.5);
  assert.deepEqual(warnings.map((w) => [w.code, w.count]), [["ZERO_LENGTH_NOTES", 1]]);
});

test("nốt ngoài 88 phím bị bỏ và có cảnh báo", () => {
  const midi = buildMidi([{ notes: [{ midi: 15, time: 0, duration: 0.5 }, { midi: 60, time: 0, duration: 0.5 }, { midi: 120, time: 1, duration: 0.5 }] }]);
  const { notes, warnings } = convertMidi(midi);
  assert.deepEqual(notes.map((n) => n.midi), [60]);
  assert.deepEqual(warnings.map((w) => [w.code, w.count]), [["OUT_OF_RANGE_NOTES", 2]]);
});

test("bài đổi tempo có cảnh báo, bài 1 tempo thì không", () => {
  const changing = buildMidi([{ notes: notesAt(40) }], { tempos: [100, 70, 120] });
  assert.deepEqual(convertMidi(changing).warnings.map((w) => [w.code, w.count]), [["TEMPO_CHANGES", 3]]);
  assert.equal(convertMidi(changing).metadata.bpm, 100);
  assert.deepEqual(convertMidi(buildMidi([{ notes: notesAt(40) }], { tempos: [90] })).warnings, []);
  // rivers-flow-in-you có 14 sự kiện tempo với 3 BPM khác nhau
  assert.deepEqual(convertMidi(readSample("rivers-flow-in-you"), { tracks: [0] }).warnings.map((w) => w.code), ["TEMPO_CHANGES"]);
});

test("bài quá nhiều nốt hoặc quá dài báo MIDI_TOO_LARGE", () => {
  const tooMany = buildMidi([{ notes: notesAt(MAX_NOTES + 1, 60, 0.01) }]);
  assert.throws(() => convertMidi(tooMany), isMidiError("MIDI_TOO_LARGE"));
  const tooLong = buildMidi([{ notes: [{ midi: 60, time: MAX_DURATION_SECONDS + 1, duration: 1 }] }]);
  assert.throws(() => convertMidi(tooLong), isMidiError("MIDI_TOO_LARGE"));
});

test("chọn track sai hoặc không có nốt chơi được thì báo lỗi rõ ràng", () => {
  const furElise = readSample("fur-elise");
  assert.throws(() => convertMidi(furElise, { tracks: [99] }), isMidiError("INVALID_TRACKS"));
  assert.throws(() => convertMidi(furElise, { tracks: ["0"] }), isMidiError("INVALID_TRACKS"));
  // Chọn trùng track không làm nhân đôi nốt
  assert.deepEqual(convertMidi(furElise, { tracks: [0, 1, 0] }).metadata.tracks, [0, 1]);

  const drumsOnly = buildMidi([{ program: 0, channel: 9, notes: notesAt(20, 36) }]);
  assert.throws(() => convertMidi(drumsOnly), isMidiError("NO_NOTES"));
  const outsideOnly = buildMidi([{ notes: [{ midi: 10, time: 0, duration: 0.5 }] }]);
  assert.throws(() => convertMidi(outsideOnly), isMidiError("NO_NOTES"));
});
