const DIFFICULTIES = ["EASY", "MEDIUM", "HARD", "EXPERT"];
// popular = nhiều lượt xem nhất, likes = nhiều lượt thích nhất
const SORT_OPTIONS = ["popular", "likes", "newest", "title"];
const DEFAULT_SORT = "popular";
const MAX_PAGE_SIZE = 50;

const CHROMATIC_NOTES = [
  { letter: "C" },
  { letter: "C", accidental: "#" },
  { letter: "D" },
  { letter: "D", accidental: "#" },
  { letter: "E" },
  { letter: "F" },
  { letter: "F", accidental: "#" },
  { letter: "G" },
  { letter: "G", accidental: "#" },
  { letter: "A" },
  { letter: "A", accidental: "#" },
  { letter: "B" },
];
const DIATONIC_LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const NOTE_DURATIONS = [
  { sixteenths: 16, code: "w" },
  { sixteenths: 12, code: "hd" },
  { sixteenths: 8, code: "h" },
  { sixteenths: 6, code: "qd" },
  { sixteenths: 4, code: "q" },
  { sixteenths: 3, code: "8d" },
  { sixteenths: 2, code: "8" },
  { sixteenths: 1, code: "16" },
];
const SEMITONES_PER_OCTAVE = 12;
const SECONDS_PER_MINUTE = 60;
const SIXTEENTHS_PER_WHOLE = 16;
const SIXTEENTHS_PER_QUARTER = 4;
const MIDI_OCTAVE_OFFSET = 1;
const STAFF_MIDDLE_LINE = {
  treble: { letter: "B", octave: 4 },
  bass: { letter: "D", octave: 3 },
};
const CLEF_BY_HAND = { right: "treble", left: "bass" };
const CHORD_GAP_SECONDS = 0.03;
const MAX_REQUIRED_NOTES = 4;
const DEFAULT_HAND_OCTAVES = { left: 3, right: 4 };

module.exports = {
  DIFFICULTIES,
  SORT_OPTIONS,
  DEFAULT_SORT,
  MAX_PAGE_SIZE,
  CHROMATIC_NOTES,
  DIATONIC_LETTERS,
  NOTE_DURATIONS,
  SEMITONES_PER_OCTAVE,
  SECONDS_PER_MINUTE,
  SIXTEENTHS_PER_WHOLE,
  SIXTEENTHS_PER_QUARTER,
  MIDI_OCTAVE_OFFSET,
  STAFF_MIDDLE_LINE,
  CLEF_BY_HAND,
  CHORD_GAP_SECONDS,
  MAX_REQUIRED_NOTES,
  DEFAULT_HAND_OCTAVES,
};
