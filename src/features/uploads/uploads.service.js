const { parseMidi, isPianoTrack, describeTracks, pickDefaultTracks, convertMidi } = require("./midiToSheet");
const { suggestTitle, estimateDifficulty } = require("./sheetSuggestions");
const { toSlug, pickFreeId } = require("./sheetId");
const uploadsRepository = require("./uploads.repository");
const sheetsRepository = require("../sheets/sheets.repository");
const sheetsService = require("../sheets/sheets.service");
const ApiError = require("../../common/exceptions/ApiError");

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

// Tag trùng tag đã có (không phân biệt hoa thường) -> dùng cách viết đã có, để lọc tag ở Library
// (phân biệt hoa thường) không bị tách "pop" / "Pop". FE cũng làm vậy, BE làm lại cho chắc.
const matchKnownTags = async (tags) => {
  if (!tags.length) return tags;
  const known = await sheetsRepository.countTags();
  return tags.map((tag) => known.find((item) => item.name.toLowerCase() === tag.toLowerCase())?.name ?? tag);
};

const MAX_ID_ATTEMPTS = 5;

// Bước 2 của upload: chuyển file theo track người dùng đã chọn, lưu bài + file gốc.
// `file`: req.file (đã kiểm tra ở receiveMidiFile); `fields`: kết quả parseSheetFields.
const createSheet = async (file, fields, userId) => {
  const { tracks, tags, ...details } = fields;
  const midi = parseMidi(file.buffer);
  const { metadata, notes } = convertMidi(midi, { tracks: tracks ?? pickDefaultTracks(describeTracks(midi)) });
  const songEnd = notes.reduce((max, n) => Math.max(max, n.time + n.duration), 0);

  const data = {
    ...details,
    tags: await matchKnownTags(tags),
    bpm: metadata.bpm,
    timeSignature: metadata.timeSignature,
    keySignature: metadata.keySignature,
    durationSec: Math.ceil(songEnd),
    noteCount: notes.length,
    uploaderId: userId,
    notes,
  };

  // 2 người cùng upload 1 tên bài: người sau gặp P2002 thì chọn lại id
  const base = toSlug(details.title);
  for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt += 1) {
    const id = pickFreeId(base, await uploadsRepository.findIdsStartingWith(base));
    try {
      // Cùng dạng với GET /sheets (uploader, isMine, likedByMe)
      return sheetsRepository.toSheet(await uploadsRepository.createSheet({ id, ...data }, file), userId);
    } catch (error) {
      if (error.code === "P2002") continue;
      // Token hợp lệ nhưng tài khoản đã bị xoá (uploaderId không còn trong users)
      if (error.code === "P2003") throw new ApiError(401, "UNAUTHORIZED", "Please log in to continue");
      throw error;
    }
  }
  throw new ApiError(409, "SHEET_ID_TAKEN", "Could not save the sheet right now. Please try again.");
};

// ===== Bài đã upload (U-BE-09). Dạng response giống GET /sheets: { data, meta } =====
// uploaderId luôn là số thật (requireAuth / parseUserId), không bao giờ undefined: Prisma coi undefined là không lọc.

// Mọi bài tôi upload, cả PRIVATE (My uploads)
const listMySheets = (query, userId) => sheetsService.listSheets(query, userId, { uploaderId: userId });

// Bài PUBLIC của một người (trang profile của Quỳnh). Người không tồn tại -> 404 USER_NOT_FOUND.
const listUserSheets = async (userId, query, viewerId) => {
  if (!(await uploadsRepository.userExists(userId))) throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  return sheetsService.listSheets(query, viewerId, { uploaderId: userId, visibility: "PUBLIC" });
};

// ===== Sửa / xoá bài của mình (U-BE-10) =====
// Không phải bài của tôi (bài người khác, bài mẫu, không tồn tại) -> 404 như nhau, không để lộ bài PRIVATE của người khác.
const notMine = (id) => new ApiError(404, "SHEET_NOT_FOUND", `Sheet "${id}" not found`);

// Chỉ đổi thông tin bài; id giữ nguyên (link cũ vẫn mở được, bìa giữ nguyên vì vẽ theo id)
const updateSheet = async (id, fields, userId) => {
  const data = fields.tags ? { ...fields, tags: await matchKnownTags(fields.tags) } : fields;
  const sheet = await uploadsRepository.updateOwnSheet(id, userId, data);
  if (!sheet) throw notMine(id);
  return sheetsRepository.toSheet(sheet, userId);
};

const deleteSheet = async (id, userId) => {
  if (!(await uploadsRepository.deleteOwnSheet(id, userId))) throw notMine(id);
};

module.exports = { analyzeMidi, createSheet, listMySheets, listUserSheets, updateSheet, deleteSheet };
