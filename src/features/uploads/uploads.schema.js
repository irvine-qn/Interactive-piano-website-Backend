const ApiError = require("../../common/exceptions/ApiError");
const {
  DIFFICULTIES,
  COVER_COLORS,
  VISIBILITIES,
  SHEET_FIELD_LIMITS: LIMITS,
  UNKNOWN_COMPOSER,
} = require("../../common/constants/sheet.constants");

// Trường form luôn là chuỗi. Nhận "0,2" hoặc nhiều trường tracks lặp lại (multer gom thành mảng).
// Không gửi / rỗng -> undefined (dùng track gợi ý).
const MAX_TRACK_INDEX_DIGITS = 3; // file MIDI tối đa 65 535 track nhưng thực tế < 1 000

const parseTrackList = (value) => {
  if (value === undefined || value === "") return undefined;
  const parts = (Array.isArray(value) ? value : String(value).split(",")).map((part) => String(part).trim());
  const pattern = new RegExp(`^\\d{1,${MAX_TRACK_INDEX_DIGITS}}$`);
  if (!parts.length || parts.some((part) => !pattern.test(part))) {
    throw new ApiError(422, "INVALID_TRACKS", "tracks must be a list of track numbers, for example 0,2.");
  }
  return parts.map(Number);
};

// ===== POST /sheets: thông tin bài =====
// Lỗi: 422 VALIDATION_FAILED, `details.field` = tên trường để FE hiện lỗi dưới đúng ô.
// Câu lỗi hiện thẳng lên giao diện (cùng câu với FE features/upload/utils/sheetDetails.js khi có thể).
const invalid = (field, message) => new ApiError(422, "VALIDATION_FAILED", message, { field });

// Gộp khoảng trắng thừa, giống cleanText ở FE
const cleanText = (value) => value.replace(/\s+/g, " ").trim();

// Trường chỉ được gửi 1 lần (gửi 2 lần multer gom thành mảng)
const readText = (body, field) => {
  const value = body[field];
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw invalid(field, `${field} must be sent once, as text.`);
  return cleanText(value);
};

const readChoice = (body, field, choices, fallback) => {
  const value = readText(body, field);
  if (value === undefined || value === "") return fallback;
  if (!choices.includes(value)) throw invalid(field, `${field} must be one of: ${choices.join(", ")}.`);
  return value;
};

// Nhiều trường `tags` cùng tên (multer gom thành mảng) hoặc 1 trường. Bỏ tag rỗng,
// trùng (không phân biệt hoa thường) thì giữ cái đầu.
const readTags = (value) => {
  if (value === undefined) return [];
  const tags = [];
  for (const raw of [].concat(value)) {
    if (typeof raw !== "string") throw invalid("tags", "tags must be text.");
    const tag = cleanText(raw);
    if (!tag) continue;
    if (tag.length > LIMITS.tag) throw invalid("tags", `A tag can be at most ${LIMITS.tag} characters.`);
    if (!tags.some((item) => item.toLowerCase() === tag.toLowerCase())) tags.push(tag);
  }
  if (tags.length > LIMITS.tags) throw invalid("tags", `You can add up to ${LIMITS.tags} tags.`);
  return tags;
};

// req.body của multipart -> { title, composer, difficulty, tags, coverColor, visibility, tracks }
const parseSheetFields = (body = {}) => {
  const title = readText(body, "title");
  if (!title) throw invalid("title", "Give your sheet a title.");
  if (title.length > LIMITS.title) throw invalid("title", `The title can be at most ${LIMITS.title} characters.`);

  const composer = readText(body, "composer") || UNKNOWN_COMPOSER;
  if (composer.length > LIMITS.composer) {
    throw invalid("composer", `The composer can be at most ${LIMITS.composer} characters.`);
  }

  const difficulty = readChoice(body, "difficulty", DIFFICULTIES);
  if (!difficulty) throw invalid("difficulty", "Choose a difficulty.");

  return {
    title,
    composer,
    difficulty,
    tags: readTags(body.tags),
    // Không gửi màu thì chọn ngẫu nhiên như FE
    coverColor: readChoice(body, "coverColor", COVER_COLORS, COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)]),
    // Bài upload mặc định chỉ người upload thấy (WBS D3)
    visibility: readChoice(body, "visibility", VISIBILITIES, "PRIVATE"),
    tracks: parseTrackList(body.tracks),
  };
};

module.exports = { parseTrackList, parseSheetFields };
