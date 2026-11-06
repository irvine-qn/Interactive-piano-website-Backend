const { parseMidi, isPianoTrack, describeTracks, pickDefaultTracks, convertMidi } = require("./midiToSheet");
const { suggestTitle, estimateDifficulty } = require("./sheetSuggestions");

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const midiToName = (midi) => (midi === null ? null : `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`);

const toTrackSummary = (info, suggested) => ({
  index: info.index,
  name: info.name,
  instrument: info.instrument,
  program: info.program,
  isPiano: isPianoTrack(info),
  isPercussion: info.percussion,
  noteCount: info.noteCount,
  minNote: midiToName(info.minMidi),
  maxNote: midiToName(info.maxMidi),
  suggested: suggested.includes(info.index),
});

// Bước 1 của upload: đọc file, gợi ý track + thông tin bài, KHÔNG lưu gì.
// Người dùng xác nhận/sửa ở FE rồi gửi lại file cùng lựa chọn ở bước tạo bài.
// `tracks` (tuỳ chọn): track người dùng đang chọn. FE gọi lại khi đổi lựa chọn để số nốt, thời lượng,
// độ khó và cảnh báo tính đúng theo các track đó (vd merry-christmas: track gợi ý là [0] -> EASY,
// chọn thêm track music box [0, 1] -> MEDIUM như catalog). Không gửi thì dùng track gợi ý.
const analyzeMidi = ({ buffer, originalname }, { tracks } = {}) => {
  const midi = parseMidi(buffer);
  const trackInfos = describeTracks(midi);
  const suggestedTracks = pickDefaultTracks(trackInfos);
  // File không có nốt nào -> 422 NO_NOTES; track không hợp lệ -> 422 INVALID_TRACKS
  const { metadata, notes, warnings } = convertMidi(midi, { tracks: tracks?.length ? tracks : suggestedTracks });
  const songEnd = notes.reduce((max, n) => Math.max(max, n.time + n.duration), 0);

  const hasPiano = trackInfos.some((info) => info.noteCount > 0 && isPianoTrack(info));
  const allWarnings = hasPiano
    ? warnings
    : [
        {
          code: "NO_PIANO_TRACK",
          count: suggestedTracks.length,
          message: "No piano track was found, so other instruments were suggested. Check the tracks before saving.",
        },
        ...warnings,
      ];

  return {
    fileName: originalname,
    suggestedTitle: suggestTitle(originalname),
    suggestedDifficulty: estimateDifficulty(notes),
    bpm: metadata.bpm,
    timeSignature: metadata.timeSignature,
    keySignature: metadata.keySignature,
    durationSec: Math.ceil(songEnd),
    noteCount: notes.length,
    // Chỉ liệt kê track có nốt (track trống không chọn được)
    tracks: trackInfos.filter((info) => info.noteCount > 0).map((info) => toTrackSummary(info, suggestedTracks)),
    suggestedTracks,
    selectedTracks: metadata.tracks,
    warnings: allWarnings,
  };
};

module.exports = { analyzeMidi };
