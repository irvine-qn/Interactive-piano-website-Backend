const {
  CHROMATIC_NOTES,
  KEY_SIGNATURES,
  NATURAL_PITCH_CLASSES,
  ACCIDENTAL_SEMITONES,
  RELATIVE_MAJOR_SEMITONES,
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

const NATURAL_ACCIDENTAL = "n";

const parsePitch = (text) => ({ letter: text[0], accidental: text[1] || "" });

const pitchClass = ({ letter, accidental }) =>
  (NATURAL_PITCH_CLASSES[letter] + (ACCIDENTAL_SEMITONES[accidental] ?? 0) + SEMITONES_PER_OCTAVE) % SEMITONES_PER_OCTAVE;

const scalePitchClasses = (key) => key.scale.map((note) => pitchClass(parsePitch(note)));

const findStatedKey = (text) => {
  const match = /^([A-G][#b]?)\s*(major|minor)?/i.exec(text ?? "");
  if (!match) return null;
  const root = pitchClass(parsePitch(match[1]));
  const majorRoot = /minor/i.test(match[2] ?? "") ? root + RELATIVE_MAJOR_SEMITONES : root;
  return KEY_SIGNATURES.find((key) => pitchClass(parsePitch(key.scale[0])) === majorRoot % SEMITONES_PER_OCTAVE) ?? null;
};

const inferKey = (notes) => {
  const weights = Array(SEMITONES_PER_OCTAVE).fill(0);
  notes.forEach(({ midi, duration }) => {
    weights[midi % SEMITONES_PER_OCTAVE] += duration;
  });
  const score = (key) => scalePitchClasses(key).reduce((sum, value) => sum + weights[value], 0);
  return KEY_SIGNATURES.reduce((best, key) => (score(key) > score(best) ? key : best));
};

const resolveKey = (keySignature, notes) => findStatedKey(keySignature) ?? inferKey(notes);

const buildKeySpelling = (key) => {
  const spelling = new Map();
  const signature = {};
  key.scale.forEach((note) => {
    const pitch = parsePitch(note);
    spelling.set(pitchClass(pitch), pitch);
    signature[pitch.letter] = pitch.accidental;
  });
  CHROMATIC_NOTES.forEach(({ letter, accidental = "" }, value) => {
    if (spelling.has(value)) return;
    if (accidental && key.usesFlats) {
      const next = DIATONIC_LETTERS[(DIATONIC_LETTERS.indexOf(letter) + 1) % DIATONIC_LETTERS.length];
      spelling.set(value, { letter: next, accidental: "b" });
    } else {
      spelling.set(value, { letter, accidental });
    }
  });
  return { spelling, signature };
};

const diatonicIndex = (letter, octave) =>
  octave * DIATONIC_LETTERS.length + DIATONIC_LETTERS.indexOf(letter);

const midiToStaffNote = (midi, clef, spelling) => {
  const { letter, accidental } = spelling.get(midi % SEMITONES_PER_OCTAVE);
  const sharp = CHROMATIC_NOTES[midi % SEMITONES_PER_OCTAVE];
  const octave = Math.floor(midi / SEMITONES_PER_OCTAVE) - MIDI_OCTAVE_OFFSET;
  const middle = STAFF_MIDDLE_LINE[clef];

  return {
    midi,
    name: `${sharp.letter}${sharp.accidental ?? ""}${octave}`,
    key: `${letter.toLowerCase()}${accidental}/${octave}`,
    spelled: { letter, accidental, octave },
    staffStep: diatonicIndex(letter, octave) - diatonicIndex(middle.letter, middle.octave),
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

const collectOnsets = (notes, hand, sixteenthSeconds) => {
  const onsets = new Map();
  notes
    .filter((note) => note.hand === hand)
    .forEach((note) => {
      const slot = Math.round(note.time / sixteenthSeconds);
      const onset = onsets.get(slot) ?? { midis: new Set(), length: 1 };
      onset.midis.add(note.midi);
      onset.length = Math.max(onset.length, Math.round(note.duration / sixteenthSeconds));
      onsets.set(slot, onset);
    });
  return onsets;
};

const buildNoteSegments = (onsets, slotsPerMeasure) => {
  const slots = [...onsets.keys()].sort((a, b) => a - b);
  const segments = [];
  slots.forEach((slot, index) => {
    const onset = onsets.get(slot);
    const end = Math.min(slot + onset.length, slots[index + 1] ?? Infinity);
    const parts = [];
    let cursor = slot;
    while (cursor < end) {
      const measureEnd = (Math.floor(cursor / slotsPerMeasure) + 1) * slotsPerMeasure;
      splitLength(Math.min(end, measureEnd) - cursor).forEach(({ sixteenths, code }) => {
        parts.push({ start: cursor, length: sixteenths, duration: code });
        cursor += sixteenths;
      });
    }
    parts.forEach((part, partIndex) => {
      segments.push({
        ...part,
        midis: [...onset.midis].sort((a, b) => a - b),
        tiedFromPrevious: partIndex > 0,
        tieToNext: partIndex < parts.length - 1,
      });
    });
  });
  return segments;
};

const applyAccidentals = (notes, signature, measureState, tiedFromPrevious) =>
  notes.map(({ spelled, ...note }) => {
    const pitchId = `${spelled.letter}${spelled.octave}`;
    const current = measureState.get(pitchId) ?? signature[spelled.letter] ?? "";
    measureState.set(pitchId, spelled.accidental);
    const changed = spelled.accidental !== current;
    const accidental = changed && !tiedFromPrevious ? spelled.accidental || NATURAL_ACCIDENTAL : null;
    return { ...note, accidental };
  });

const buildStaffEvents = (segments, clef, slotsPerMeasure, measureIndex, { spelling, signature }) => {
  const measureStart = measureIndex * slotsPerMeasure;
  const events = [];
  const measureState = new Map();
  const addRests = (startSlot, length) => {
    let slot = startSlot;
    splitLength(length).forEach(({ sixteenths, code }) => {
      events.push({ slot, length: sixteenths, duration: code, isRest: true, tieToNext: false, notes: [] });
      slot += sixteenths;
    });
  };
  let cursor = 0;

  segments
    .filter(({ start }) => start >= measureStart && start < measureStart + slotsPerMeasure)
    .forEach(({ start, length, duration, midis, tiedFromPrevious, tieToNext }) => {
      const slot = start - measureStart;
      if (slot > cursor) addRests(cursor, slot - cursor);
      const notes = midis.map((midi) => midiToStaffNote(midi, clef, spelling));
      events.push({
        slot,
        length,
        duration,
        isRest: false,
        tieToNext,
        notes: applyAccidentals(notes, signature, measureState, tiedFromPrevious),
      });
      cursor = slot + length;
    });
  if (cursor < slotsPerMeasure) addRests(cursor, slotsPerMeasure - cursor);
  return events;
};

const buildScore = ({ notes, bpm, timeSignature, keySignature }) => {
  const [beats, beatUnit] = timeSignature;
  const sixteenthSeconds = SECONDS_PER_MINUTE / bpm / SIXTEENTHS_PER_QUARTER;
  const slotsPerMeasure = beats * (SIXTEENTHS_PER_WHOLE / beatUnit);
  const key = resolveKey(keySignature, notes);
  const keySpelling = buildKeySpelling(key);
  const right = buildNoteSegments(collectOnsets(notes, "right", sixteenthSeconds), slotsPerMeasure);
  const left = buildNoteSegments(collectOnsets(notes, "left", sixteenthSeconds), slotsPerMeasure);
  const lastSlot = Math.max(0, ...[...right, ...left].map(({ start }) => start));
  const measureCount = notes.length ? Math.floor(lastSlot / slotsPerMeasure) + 1 : 0;

  return {
    beats,
    beatUnit,
    keySignature: key.name,
    slotsPerMeasure,
    measureSeconds: slotsPerMeasure * sixteenthSeconds,
    measures: Array.from({ length: measureCount }, (_, index) => ({
      index,
      treble: buildStaffEvents(right, CLEF_BY_HAND.right, slotsPerMeasure, index, keySpelling),
      bass: buildStaffEvents(left, CLEF_BY_HAND.left, slotsPerMeasure, index, keySpelling),
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

module.exports = { buildScore, buildChords, resolveKey };
