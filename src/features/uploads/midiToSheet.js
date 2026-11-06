// Engine chuyển file MIDI thành nốt nhạc của sheet ({ midi, name, time, duration, velocity, hand }).
// Dùng chung cho tool seed (scripts/midi-to-sheet.mjs, build-sheets.mjs) và tính năng upload.
// Không đọc file: nhận Buffer (parseMidi) hoặc đối tượng Midi (các hàm còn lại).
// Lỗi ném ra là ApiError 422 (mã + câu tiếng Anh) để API upload trả thẳng cho người dùng.
const { Midi } = require("@tonejs/midi");
const ApiError = require("../../common/exceptions/ApiError");

// Giới hạn 88 phím đàn (A0 - C8)
const PIANO_MIN_MIDI = 21;
const PIANO_MAX_MIDI = 108;
// Track đơn thì chia tay theo cao độ: từ C4 trở lên là tay phải
const HAND_SPLIT_MIDI = 60;
// GM program 0-7 là họ piano
const MAX_PIANO_PROGRAM = 7;
const DEFAULT_BPM = 120;
const DEFAULT_TIME_SIGNATURE = [4, 4];

// Mọi file MIDI chuẩn bắt đầu bằng chunk "MThd" dài 14 byte
const MIDI_HEADER = "MThd";
const MIDI_HEADER_BYTES = 14;
// Nốt dài 0 giây (có trong file thật, vd chasing-kou) không thấy trên waterfall và gần như không kêu
const MIN_NOTE_SECONDS = 0.05;
// Giới hạn cho file người dùng tải lên: bài piano dài nhất trong thư viện mẫu khoảng 2 700 nốt, 4 phút
const MAX_NOTES = 20000;
const MAX_DURATION_SECONDS = 20 * 60;
// Track có ít hơn 5% số nốt của track lớn nhất thường là track phụ (vd golden-hour: 19 nốt so với 2 017)
const SMALL_TRACK_RATIO = 0.05;

const round = (value, digits = 4) => Number(value.toFixed(digits));

const midiError = (code, message, details) => new ApiError(422, code, message, details);

// @tonejs/midi quy thời gian nốt ra giây theo toàn bộ tempo map, nên bài đổi tempo vẫn đúng thời gian
const parseMidi = (buffer) => {
  const isMidi =
    Buffer.isBuffer(buffer) &&
    buffer.length >= MIDI_HEADER_BYTES &&
    buffer.toString("latin1", 0, MIDI_HEADER.length) === MIDI_HEADER;
  if (!isMidi) throw midiError("INVALID_MIDI", "This file is not a MIDI file.");
  try {
    return new Midi(buffer);
  } catch {
    throw midiError("INVALID_MIDI", "This MIDI file is damaged and cannot be read.");
  }
};

const isPianoTrack = (info) => !info.percussion && info.program <= MAX_PIANO_PROGRAM;

const describeTracks = (midi) =>
  midi.tracks.map((track, index) => {
    const pitches = track.notes.map((n) => n.midi);
    const total = pitches.reduce((sum, p) => sum + p, 0);
    return {
      index,
      name: track.name,
      channel: track.channel,
      program: track.instrument.number,
      // Một số file có số nhạc cụ ngoài bảng tên của @tonejs/midi (vd flower-dance: 118)
      instrument: track.instrument.name || null,
      percussion: track.instrument.percussion,
      noteCount: pitches.length,
      minMidi: pitches.length ? Math.min(...pitches) : null,
      maxMidi: pitches.length ? Math.max(...pitches) : null,
      avgMidi: pitches.length ? round(total / pitches.length, 1) : null,
    };
  });

// Track gợi ý: track piano có nốt (không có thì mọi track không phải trống), bỏ track quá nhỏ so với track chính.
// Chỉ là gợi ý: upload cho người dùng xem và sửa (khớp 8/9 bài mẫu so với lựa chọn tay trong catalog.json).
const pickDefaultTracks = (trackInfos) => {
  const melodic = trackInfos.filter((t) => t.noteCount > 0 && !t.percussion);
  const piano = melodic.filter(isPianoTrack);
  const pool = piano.length ? piano : melodic;
  if (!pool.length) return [];
  const largest = Math.max(...pool.map((t) => t.noteCount));
  return pool.filter((t) => t.noteCount >= largest * SMALL_TRACK_RATIO).map((t) => t.index);
};

// Nhiều track: track có cao độ trung bình thấp nhất là tay trái, còn lại là tay phải.
// Một track: chia theo HAND_SPLIT_MIDI.
const buildHandResolver = (selectedInfos) => {
  if (selectedInfos.length === 1) {
    return (_trackIndex, midi) => (midi >= HAND_SPLIT_MIDI ? "right" : "left");
  }
  const leftTrack = selectedInfos.reduce((low, t) => (t.avgMidi < low.avgMidi ? t : low));
  return (trackIndex) => (trackIndex === leftTrack.index ? "left" : "right");
};

const selectTracks = (trackInfos, tracks) => {
  if (!tracks?.length) {
    const suggested = pickDefaultTracks(trackInfos);
    if (!suggested.length) throw midiError("NO_NOTES", "This MIDI file has no notes to play.");
    return suggested;
  }
  const unique = [...new Set(tracks)];
  unique.forEach((index) => {
    const info = Number.isInteger(index) ? trackInfos[index] : null;
    if (!info || info.noteCount === 0) {
      throw midiError("INVALID_TRACKS", `Track ${index} does not exist or has no notes.`, { track: index });
    }
  });
  return unique;
};

// "1 note was", "3 notes were"
const countNotes = (count) => (count === 1 ? "1 note was" : `${count} notes were`);

const buildWarnings = ({ outOfRange, lengthened, tempoCount }) => {
  const warnings = [];
  if (outOfRange) {
    warnings.push({
      code: "OUT_OF_RANGE_NOTES",
      count: outOfRange,
      message: `${countNotes(outOfRange)} outside the 88 piano keys and removed.`,
    });
  }
  if (lengthened) {
    warnings.push({
      code: "ZERO_LENGTH_NOTES",
      count: lengthened,
      message: `${countNotes(lengthened)} too short to hear and lengthened to ${MIN_NOTE_SECONDS * 1000} ms.`,
    });
  }
  // Waterfall và chế độ Play không bị ảnh hưởng; bản nhạc (sheets.score.js) tính theo 1 BPM nên lệch ô nhịp
  if (tempoCount > 1) {
    warnings.push({
      code: "TEMPO_CHANGES",
      count: tempoCount,
      message: `The song uses ${tempoCount} different tempos, so the sheet music view may not line up with the bars.`,
    });
  }
  return warnings;
};

// Trả { metadata, notes, warnings }. Tool seed chỉ lưu metadata + notes.
const convertMidi = (midi, { tracks } = {}) => {
  const trackInfos = describeTracks(midi);
  const trackIndexes = selectTracks(trackInfos, tracks);
  const resolveHand = buildHandResolver(trackIndexes.map((index) => trackInfos[index]));
  const seen = new Set();
  const notes = [];
  let outOfRange = 0;
  let lengthened = 0;

  trackIndexes.forEach((trackIndex) => {
    midi.tracks[trackIndex].notes.forEach((note) => {
      if (note.midi < PIANO_MIN_MIDI || note.midi > PIANO_MAX_MIDI) {
        outOfRange += 1;
        return;
      }

      // Khử nốt trùng (cùng cao độ, cùng thời điểm) giữa các track
      const key = `${note.midi}-${note.time.toFixed(3)}`;
      if (seen.has(key)) return;
      seen.add(key);

      let duration = round(note.duration);
      if (duration <= 0) {
        duration = MIN_NOTE_SECONDS;
        lengthened += 1;
      }

      notes.push({
        midi: note.midi,
        name: note.name,
        time: round(note.time),
        duration,
        velocity: round(note.velocity),
        hand: resolveHand(trackIndex, note.midi),
      });
    });
  });

  if (!notes.length) {
    throw midiError("NO_NOTES", "The selected tracks have no notes inside the 88 piano keys.");
  }
  const songEnd = notes.reduce((max, n) => Math.max(max, n.time + n.duration), 0);
  if (notes.length > MAX_NOTES || songEnd > MAX_DURATION_SECONDS) {
    throw midiError(
      "MIDI_TOO_LARGE",
      `The song is too long: at most ${MAX_NOTES} notes and ${MAX_DURATION_SECONDS / 60} minutes.`,
      { notes: notes.length, durationSec: Math.ceil(songEnd) },
    );
  }

  notes.sort((a, b) => a.time - b.time || a.midi - b.midi);

  const { tempos, timeSignatures, keySignatures } = midi.header;
  const key = keySignatures[0];
  const tempoCount = new Set(tempos.map((t) => Math.round(t.bpm))).size;
  return {
    metadata: {
      bpm: tempos.length ? Math.round(tempos[0].bpm) : DEFAULT_BPM,
      timeSignature: timeSignatures.length ? timeSignatures[0].timeSignature : DEFAULT_TIME_SIGNATURE,
      keySignature: key ? `${key.key} ${key.scale}` : null,
      tracks: trackIndexes,
    },
    notes,
    warnings: buildWarnings({ outOfRange, lengthened, tempoCount }),
  };
};

module.exports = {
  parseMidi,
  isPianoTrack,
  describeTracks,
  pickDefaultTracks,
  convertMidi,
  MIN_NOTE_SECONDS,
  MAX_NOTES,
  MAX_DURATION_SECONDS,
};
