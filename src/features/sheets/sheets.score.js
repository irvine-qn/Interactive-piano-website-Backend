const {
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
} = require("../../common/constants/sheet.constants");

const diatonicIndex = (letter, octave) =>
  octave * DIATONIC_LETTERS.length + DIATONIC_LETTERS.indexOf(letter);

const midiToStaffNote = (midi, clef) => {
  const pitch = CHROMATIC_NOTES[midi % SEMITONES_PER_OCTAVE];
  const octave = Math.floor(midi / SEMITONES_PER_OCTAVE) - MIDI_OCTAVE_OFFSET;
  const accidental = pitch.accidental || null;
  const middle = STAFF_MIDDLE_LINE[clef];

  return {
    midi,
    name: `${pitch.letter}${accidental ?? ""}${octave}`,
    key: `${pitch.letter.toLowerCase()}${accidental ?? ""}/${octave}`,
    accidental,
    staffStep: diatonicIndex(pitch.letter, octave) - diatonicIndex(middle.letter, middle.octave),
  };
};

const splitLength = (length) => {
  const parts = [];
  let remaining = length;
  while (remaining > 0) {
    const part = NOTE_DURATIONS.find(({ sixteenths }) => sixteenths <= remaining);
    parts.push(part);
    remaining -= part.sixteenths;
  }
  return parts;
};

const buildStaffEvents = (onsets, clef, slotsPerMeasure) => {
  const events = [];
  const addRests = (startSlot, length) => {
    let slot = startSlot;
    splitLength(length).forEach(({ sixteenths, code }) => {
      events.push({ slot, length: sixteenths, duration: code, isRest: true, notes: [] });
      slot += sixteenths;
    });
  };
  const slots = [...onsets.keys()].sort((a, b) => a - b);
  let cursor = 0;

  slots.forEach((slot, index) => {
    if (slot > cursor) addRests(cursor, slot - cursor);
    const onset = onsets.get(slot);
    const limit = (slots[index + 1] ?? slotsPerMeasure) - slot;
    const [{ sixteenths, code }] = splitLength(Math.min(onset.length, limit));
    events.push({
      slot,
      length: sixteenths,
      duration: code,
      isRest: false,
      notes: [...onset.midis].sort((a, b) => a - b).map((midi) => midiToStaffNote(midi, clef)),
    });
    cursor = slot + sixteenths;
  });
  if (cursor < slotsPerMeasure) addRests(cursor, slotsPerMeasure - cursor);
  return events;
};

const buildScore = ({ notes, bpm, timeSignature }) => {
  const [beats, beatUnit] = timeSignature;
  const sixteenthSeconds = SECONDS_PER_MINUTE / bpm / SIXTEENTHS_PER_QUARTER;
  const slotsPerMeasure = beats * (SIXTEENTHS_PER_WHOLE / beatUnit);
  const measureOnsets = [];

  notes.forEach((note) => {
    const slot = Math.round(note.time / sixteenthSeconds);
    const measureIndex = Math.floor(slot / slotsPerMeasure);
    while (measureOnsets.length <= measureIndex) measureOnsets.push({ left: new Map(), right: new Map() });

    const onsets = measureOnsets[measureIndex][note.hand];
    const slotInMeasure = slot % slotsPerMeasure;
    const onset = onsets.get(slotInMeasure) ?? { midis: new Set(), length: 1 };
    onset.midis.add(note.midi);
    onset.length = Math.max(onset.length, Math.round(note.duration / sixteenthSeconds));
    onsets.set(slotInMeasure, onset);
  });

  return {
    beats,
    beatUnit,
    slotsPerMeasure,
    measureSeconds: slotsPerMeasure * sixteenthSeconds,
    measures: measureOnsets.map((onsets, index) => ({
      index,
      treble: buildStaffEvents(onsets.right, CLEF_BY_HAND.right, slotsPerMeasure),
      bass: buildStaffEvents(onsets.left, CLEF_BY_HAND.left, slotsPerMeasure),
    })),
  };
};

module.exports = { buildScore, midiToStaffNote };
