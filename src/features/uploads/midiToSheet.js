// Engine chuyển file MIDI thành nốt nhạc của sheet ({ midi, name, time, duration, velocity, hand }).
// Dùng chung cho tool seed (scripts/midi-to-sheet.mjs, build-sheets.mjs) và tính năng upload.
// Không đọc file: nhận Buffer (parseMidi) hoặc đối tượng Midi (các hàm còn lại).
const { Midi } = require("@tonejs/midi");

// Giới hạn 88 phím đàn (A0 - C8)
const PIANO_MIN_MIDI = 21;
const PIANO_MAX_MIDI = 108;
// Track đơn thì chia tay theo cao độ: từ C4 trở lên là tay phải
const HAND_SPLIT_MIDI = 60;
// GM program 0-7 là họ piano
const MAX_PIANO_PROGRAM = 7;
const DEFAULT_BPM = 120;
const DEFAULT_TIME_SIGNATURE = [4, 4];

const round = (value, digits = 4) => Number(value.toFixed(digits));

// @tonejs/midi quy thời gian nốt ra giây theo toàn bộ tempo map, nên bài đổi tempo vẫn đúng thời gian
const parseMidi = (buffer) => new Midi(buffer);

const describeTracks = (midi) =>
  midi.tracks.map((track, index) => {
    const pitches = track.notes.map((n) => n.midi);
    const total = pitches.reduce((sum, p) => sum + p, 0);
    return {
      index,
      name: track.name,
      channel: track.channel,
      program: track.instrument.number,
      instrument: track.instrument.name,
      percussion: track.instrument.percussion,
      noteCount: pitches.length,
      minMidi: pitches.length ? Math.min(...pitches) : null,
      maxMidi: pitches.length ? Math.max(...pitches) : null,
      avgMidi: pitches.length ? round(total / pitches.length, 1) : null,
    };
  });

// Chỉ dùng khi không khai báo track: lấy các track piano có nốt, bỏ track trống/drum
const pickDefaultTracks = (trackInfos) =>
  trackInfos
    .filter((t) => t.noteCount > 0 && !t.percussion && t.program <= MAX_PIANO_PROGRAM)
    .map((t) => t.index);

// Nhiều track: track có cao độ trung bình thấp nhất là tay trái, còn lại là tay phải.
// Một track: chia theo HAND_SPLIT_MIDI.
const buildHandResolver = (selectedInfos) => {
  if (selectedInfos.length === 1) {
    return (_trackIndex, midi) => (midi >= HAND_SPLIT_MIDI ? "right" : "left");
  }
  const leftTrack = selectedInfos.reduce((low, t) => (t.avgMidi < low.avgMidi ? t : low));
  return (trackIndex) => (trackIndex === leftTrack.index ? "left" : "right");
};

const convertMidi = (midi, { tracks } = {}) => {
  const trackInfos = describeTracks(midi);
  const trackIndexes = tracks?.length ? tracks : pickDefaultTracks(trackInfos);

  if (!trackIndexes.length) {
    throw new Error("Không tìm thấy track piano, hãy chỉ định bằng --tracks");
  }
  const selectedInfos = trackIndexes.map((index) => {
    const info = trackInfos[index];
    if (!info || info.noteCount === 0) {
      throw new Error(`Track ${index} không tồn tại hoặc không có nốt`);
    }
    return info;
  });

  const resolveHand = buildHandResolver(selectedInfos);
  const seen = new Set();
  const notes = [];

  trackIndexes.forEach((trackIndex) => {
    midi.tracks[trackIndex].notes.forEach((note) => {
      if (note.midi < PIANO_MIN_MIDI || note.midi > PIANO_MAX_MIDI) return;

      // Khử nốt trùng (cùng cao độ, cùng thời điểm) giữa các track
      const key = `${note.midi}-${note.time.toFixed(3)}`;
      if (seen.has(key)) return;
      seen.add(key);

      notes.push({
        midi: note.midi,
        name: note.name,
        time: round(note.time),
        duration: round(note.duration),
        velocity: round(note.velocity),
        hand: resolveHand(trackIndex, note.midi),
      });
    });
  });

  notes.sort((a, b) => a.time - b.time || a.midi - b.midi);

  const { tempos, timeSignatures, keySignatures } = midi.header;
  const key = keySignatures[0];
  return {
    metadata: {
      bpm: tempos.length ? Math.round(tempos[0].bpm) : DEFAULT_BPM,
      timeSignature: timeSignatures.length ? timeSignatures[0].timeSignature : DEFAULT_TIME_SIGNATURE,
      keySignature: key ? `${key.key} ${key.scale}` : null,
      tracks: trackIndexes,
    },
    notes,
  };
};

module.exports = { parseMidi, describeTracks, pickDefaultTracks, convertMidi };
