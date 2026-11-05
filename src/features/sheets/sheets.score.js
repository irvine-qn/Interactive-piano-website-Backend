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
  CHORD_GAP_SECONDS,
  MAX_REQUIRED_NOTES,
  DEFAULT_HAND_OCTAVES,
} = require("../../common/constants/sheet.constants");
const { PRACTICE_KEY_ZONES, PRACTICE_OCTAVE_RANGE } = require("../../common/constants/piano.constants");

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

const octaveBaseMidi = (octave) => (octave + MIDI_OCTAVE_OFFSET) * SEMITONES_PER_OCTAVE;

const isInZone = (midi, hand, octave) => {
  const offset = midi - octaveBaseMidi(octave);
  return offset >= 0 && offset < PRACTICE_KEY_ZONES[hand].length;
};

const chooseOctave = (notes, hand, previous) => {
  if (!notes.length) return previous;
  const candidates = new Set();
  notes.forEach(({ midi }) => {
    const octave = Math.floor(midi / SEMITONES_PER_OCTAVE) - MIDI_OCTAVE_OFFSET;
    [octave - 1, octave].forEach((value) => {
      if (value >= PRACTICE_OCTAVE_RANGE.min && value <= PRACTICE_OCTAVE_RANGE.max) candidates.add(value);
    });
  });
  const reachable = (octave) => notes.filter(({ midi }) => isInZone(midi, hand, octave)).length;
  return [...candidates].reduce((best, octave) => {
    const difference = reachable(octave) - reachable(best);
    if (difference > 0) return octave;
    if (difference < 0) return best;
    return Math.abs(octave - previous) < Math.abs(best - previous) ? octave : best;
  }, previous);
};

const findShortcut = ({ midi, hand }, octaves) =>
  PRACTICE_KEY_ZONES[hand].find(({ offset }) => offset === midi - octaveBaseMidi(octaves[hand]))?.label ?? null;

const chooseRequiredNotes = (notes, octaves) => {
  const byHand = {
    left: notes.filter(({ hand, midi }) => hand === "left" && isInZone(midi, hand, octaves.left)).sort((a, b) => a.midi - b.midi),
    right: notes.filter(({ hand, midi }) => hand === "right" && isInZone(midi, hand, octaves.right)).sort((a, b) => b.midi - a.midi),
  };
  while (byHand.left.length + byHand.right.length > MAX_REQUIRED_NOTES) {
    (byHand.left.length > byHand.right.length ? byHand.left : byHand.right).pop();
  }
  return new Set([...byHand.left, ...byHand.right].map(({ name }) => name));
};

const buildChords = (notes) => {
  const groups = [];
  notes.forEach(({ name, hand, time, midi, duration, velocity }) => {
    const last = groups[groups.length - 1];
    const note = { name, hand, midi, duration, velocity };
    if (last && time - last.time <= CHORD_GAP_SECONDS) {
      if (!last.notes.some((item) => item.name === name)) last.notes.push(note);
    } else {
      groups.push({ time, notes: [note] });
    }
  });

  let octaves = DEFAULT_HAND_OCTAVES;
  return groups.map((group, index) => {
    const handNotes = (hand) => group.notes.filter((note) => note.hand === hand);
    const previousOctaves = octaves;
    octaves = {
      left: chooseOctave(handNotes("left"), "left", octaves.left),
      right: chooseOctave(handNotes("right"), "right", octaves.right),
    };
    const required = chooseRequiredNotes(group.notes, octaves);
    return {
      index,
      time: group.time,
      octaves,
      zoneMoves: { left: octaves.left - previousOctaves.left, right: octaves.right - previousOctaves.right },
      notes: group.notes.map((note) => ({
        ...note,
        required: required.has(note.name),
        shortcut: required.has(note.name) ? findShortcut(note, octaves) : null,
      })),
    };
  });
};

module.exports = { buildScore, buildChords, midiToStaffNote };
