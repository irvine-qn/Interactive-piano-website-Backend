const {
  NOTE_NAMES,
  MIN_NOTE,
  MAX_NOTE,
  MIN_BPM,
  MAX_BPM,
  DEFAULT_BPM,
  KEYBOARD_KEYS,
  PRACTICE_KEY_ZONES,
  PRACTICE_CHORD_KEYS,
  PRACTICE_OCTAVE_RANGE,
} = require("../../common/constants/piano.constants");

const notes = Array.from({ length: MAX_NOTE - MIN_NOTE + 1 }, (_, index) => {
  const midi = MIN_NOTE + index;
  const name = `${NOTE_NAMES[midi % NOTE_NAMES.length]}${Math.floor(midi / 12) - 1}`;
  const frequency = Number((440 * 2 ** ((midi - 69) / 12)).toFixed(1));
  return {
    midi,
    name,
    frequency,
    keyboardKey: KEYBOARD_KEYS[index] ?? null,
  };
});

const frequencies = Object.fromEntries(
  notes.map(({ name, frequency }) => [name, frequency]),
);

const getPianoConfig = () => ({
  minBpm: MIN_BPM,
  maxBpm: MAX_BPM,
  defaultBpm: DEFAULT_BPM,
  minMidiNote: MIN_NOTE,
  maxMidiNote: MAX_NOTE,
  notes,
  practiceKeys: { zones: PRACTICE_KEY_ZONES, chordKeys: PRACTICE_CHORD_KEYS, octaveRange: PRACTICE_OCTAVE_RANGE },
});

const getFrequencies = () => frequencies;

module.exports = {
  getPianoConfig,
  getFrequencies,
};
