const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];
const MIN_NOTE = 24;
const MAX_NOTE = 96;
const MIN_BPM = 30;
const MAX_BPM = 240;
const DEFAULT_BPM = 120;
const KEYBOARD_KEYS = [
  "1",
  "!",
  "2",
  "@",
  "3",
  "4",
  "$",
  "5",
  "%",
  "6",
  "^",
  "7",
  "8",
  "*",
  "9",
  "(",
  "0",
  "q",
  "Q",
  "w",
  "W",
  "e",
  "E",
  "r",
  "t",
  "T",
  "y",
  "Y",
  "u",
  "i",
  "I",
  "o",
  "O",
  "p",
  "P",
  "a",
  "s",
  "S",
  "d",
  "D",
  "f",
  "g",
  "G",
  "h",
  "H",
  "j",
  "J",
  "k",
  "l",
  "L",
  "z",
  "Z",
  "x",
  "c",
  "C",
  "v",
  "V",
  "b",
  "B",
  "n",
  "m",
];

const toZone = (keys) => keys.map(([code, label], offset) => ({ code, label, offset }));
const PRACTICE_KEY_ZONES = {
  left: toZone([
    ["KeyZ", "Z"], ["KeyS", "S"], ["KeyX", "X"], ["KeyD", "D"], ["KeyC", "C"], ["KeyV", "V"],
    ["KeyG", "G"], ["KeyB", "B"], ["KeyH", "H"], ["KeyN", "N"], ["KeyJ", "J"], ["KeyM", "M"],
    ["Comma", ","], ["KeyL", "L"], ["Period", "."], ["Semicolon", ";"], ["Slash", "/"],
  ]),
  right: toZone([
    ["KeyQ", "Q"], ["Digit2", "2"], ["KeyW", "W"], ["Digit3", "3"], ["KeyE", "E"], ["KeyR", "R"],
    ["Digit5", "5"], ["KeyT", "T"], ["Digit6", "6"], ["KeyY", "Y"], ["Digit7", "7"], ["KeyU", "U"],
    ["KeyI", "I"], ["Digit9", "9"], ["KeyO", "O"], ["Digit0", "0"], ["KeyP", "P"],
  ]),
};
const toChordKeys = (keys) =>
  keys.map(([code, label], index) => ({ code, label, ...CHORD_TYPES[index] }));
const CHORD_TYPES = [
  { name: "major", intervals: [0, 4, 7] },
  { name: "minor", intervals: [0, 3, 7] },
  { name: "seventh", intervals: [0, 4, 7, 10] },
];
const PRACTICE_CHORD_KEYS = {
  left: toChordKeys([["KeyA", "A"], ["KeyF", "F"], ["KeyK", "K"]]),
  right: toChordKeys([["Digit1", "1"], ["Digit4", "4"], ["Digit8", "8"]]),
};
const PRACTICE_OCTAVE_RANGE = { min: 0, max: 7 };

module.exports = {
  PRACTICE_KEY_ZONES,
  PRACTICE_CHORD_KEYS,
  PRACTICE_OCTAVE_RANGE,
  NOTE_NAMES,
  MIN_NOTE,
  MAX_NOTE,
  MIN_BPM,
  MAX_BPM,
  DEFAULT_BPM,
  KEYBOARD_KEYS,
};
