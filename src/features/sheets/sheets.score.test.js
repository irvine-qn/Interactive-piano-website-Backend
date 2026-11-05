const test = require("node:test");
const assert = require("node:assert/strict");
const { buildChords, buildScore, resolveKey } = require("./sheets.score");

const note = (midi, time, duration, hand = "right") => ({
  midi,
  name: "X",
  time,
  duration,
  hand,
  velocity: 0.5,
});
const sheet = (notes, keySignature = "C major") => ({ notes, bpm: 60, timeSignature: [4, 4], keySignature });
const firstNote = (measure) => measure.treble.find((event) => !event.isRest);

test("mọi ô nhịp đủ số phách", () => {
  const score = buildScore(sheet([note(60, 0, 1), note(62, 1.5, 0.25), note(48, 2, 3, "left")]));
  score.measures.forEach(({ treble, bass }) => {
    [treble, bass].forEach((events) => {
      assert.equal(events.reduce((sum, event) => sum + event.length, 0), score.slotsPerMeasure);
    });
  });
});

test("nốt ngân qua vạch nhịp được nối sang ô sau", () => {
  const score = buildScore(sheet([note(60, 3, 2)]));
  assert.equal(score.measures.length, 2);
  assert.equal(firstNote(score.measures[0]).tieToNext, true);
  assert.equal(firstNote(score.measures[1]).tieToNext, false);
  assert.equal(firstNote(score.measures[1]).notes[0].midi, 60);
});

test("nốt có độ dài không chuẩn được tách và nối trong ô", () => {
  const score = buildScore(sheet([note(60, 0, 1.25)]));
  const played = score.measures[0].treble.filter((event) => !event.isRest);
  assert.deepEqual(played.map((event) => event.length), [4, 1]);
  assert.equal(played[0].tieToNext, true);
});

test("nốt thuộc hoá biểu không ghi dấu, nốt ngoài hoá biểu có dấu", () => {
  const score = buildScore(sheet([note(66, 0, 1), note(65, 1, 1), note(65, 2, 1)], "D major"));
  assert.equal(score.keySignature, "D");
  const played = score.measures[0].treble.filter((event) => !event.isRest);
  assert.equal(played[0].notes[0].key, "f#/4");
  assert.equal(played[0].notes[0].accidental, null);
  assert.equal(played[1].notes[0].accidental, "n");
  assert.equal(played[2].notes[0].accidental, null);
});

test("giọng dùng dấu giáng viết tên nốt bằng dấu giáng", () => {
  const score = buildScore(sheet([note(70, 0, 1)], "F major"));
  const event = firstNote(score.measures[0]);
  assert.equal(event.notes[0].key, "bb/4");
  assert.equal(event.notes[0].name, "A#4");
  assert.equal(event.notes[0].accidental, null);
});

test("giọng thứ dùng hoá biểu của giọng trưởng tương ứng", () => {
  assert.equal(resolveKey("A minor", []).name, "C");
  assert.equal(resolveKey("D minor", []).name, "F");
});

test("bài chưa có giọng được suy ra từ nốt", () => {
  const dMajor = [62, 64, 66, 67, 69, 71, 73].map((midi, index) => note(midi, index, 1));
  assert.equal(resolveKey(null, dMajor).name, "D");
});

test("vị trí trên khuông tính từ dòng giữa", () => {
  const score = buildScore(sheet([note(71, 0, 1), note(50, 0, 1, "left")]));
  assert.equal(firstNote(score.measures[0]).notes[0].staffStep, 0);
  assert.equal(score.measures[0].bass.find((event) => !event.isRest).notes[0].staffStep, 0);
});

test("các nốt gần nhau được gom thành hợp âm, tối đa 4 nốt bắt buộc", () => {
  const names = ["C3", "E3", "G3", "C4", "E4", "G4"];
  const notes = [48, 52, 55, 60, 64, 67].map((midi, index) => ({
    ...note(midi, index * 0.005, 1, index < 3 ? "left" : "right"),
    name: names[index],
  }));
  const chords = buildChords(notes);
  assert.equal(chords.length, 1);
  const required = chords[0].notes.filter((item) => item.required);
  assert.equal(required.length, 4);
  required.forEach((item) => assert.ok(item.shortcut));
  chords[0].notes.filter((item) => !item.required).forEach((item) => assert.equal(item.shortcut, null));
});

test("Zone dời khi nốt nằm ngoài vùng hiện tại", () => {
  const chords = buildChords([
    { ...note(60, 0, 1), name: "C4" },
    { ...note(96, 1, 1), name: "C7" },
  ]);
  assert.ok(chords[1].zoneMoves.right > 0);
  assert.ok(chords[1].notes[0].shortcut);
});
