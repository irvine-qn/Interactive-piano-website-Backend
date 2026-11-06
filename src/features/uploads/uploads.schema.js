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
  if (Array.isArray(value)) throw invalid(field, `${field} must be sent once.`);
  if (typeof value !== "string") throw invalid(field, `${field} must be text.`);
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

const readTitle = (body) => {
  const title = readText(body, "title");
  if (!title) throw invalid("title", "Give your sheet a title.");
  if (title.length > LIMITS.title) throw invalid("title", `The title can be at most ${LIMITS.title} characters.`);
  return title;
};

const readComposer = (body) => {
  const composer = readText(body, "composer") || UNKNOWN_COMPOSER;
  if (composer.length > LIMITS.composer) {
    throw invalid("composer", `The composer can be at most ${LIMITS.composer} characters.`);
  }
  return composer;
};

const readDifficulty = (body) => {
  const difficulty = readChoice(body, "difficulty", DIFFICULTIES);
  if (!difficulty) throw invalid("difficulty", "Choose a difficulty.");
  return difficulty;
};

// req.body của multipart -> { title, composer, difficulty, tags, coverColor, visibility, tracks }
const parseSheetFields = (body = {}) => {
  const title = readTitle(body);
  const composer = readComposer(body);
  const difficulty = readDifficulty(body);

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

// ===== GET /users/:id/sheets =====
// id người dùng là số nguyên dương; sai dạng thì coi như không có người này (404, như id không tồn tại)
const MAX_USER_ID = 2147483647; // cột users.id là INT 4 byte
const parseUserId = (value) => {
  const id = /^\d{1,10}$/.test(String(value)) ? Number(value) : NaN;
  if (!Number.isInteger(id) || id < 1 || id > MAX_USER_ID) throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  return id;
};

// ===== PATCH /sheets/:id (JSON): chỉ sửa thông tin bài, không đổi nốt / file / id =====
// Chỉ kiểm tra các trường có gửi, cùng luật với lúc tạo bài. Trường khác (notes, id, tracks...) -> 422.
const EDITABLE_READERS = {
  title: readTitle,
  composer: readComposer,
  difficulty: readDifficulty,
  tags: (body) => {
    if (!Array.isArray(body.tags)) throw invalid("tags", "tags must be a list of text.");
    return readTags(body.tags);
  },
  coverColor: (body) => {
    const color = readChoice(body, "coverColor", COVER_COLORS);
    if (!color) throw invalid("coverColor", `coverColor must be one of: ${COVER_COLORS.join(", ")}.`);
    return color;
  },
  visibility: (body) => {
    const visibility = readChoice(body, "visibility", VISIBILITIES);
    if (!visibility) throw invalid("visibility", `visibility must be one of: ${VISIBILITIES.join(", ")}.`);
    return visibility;
  },
};

const parseSheetUpdate = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(422, "VALIDATION_FAILED", "Send the fields to change as a JSON object.");
  }
  const unknown = Object.keys(body).find((field) => !EDITABLE_READERS[field]);
  if (unknown) {
    throw invalid(unknown, `${unknown} cannot be changed. You can change: ${Object.keys(EDITABLE_READERS).join(", ")}.`);
  }
  const fields = Object.fromEntries(Object.keys(body).map((field) => [field, EDITABLE_READERS[field](body)]));
  if (!Object.keys(fields).length) throw new ApiError(422, "VALIDATION_FAILED", "Nothing to change.");
  return fields;
};

module.exports = { parseTrackList, parseSheetFields, parseSheetUpdate, parseUserId };
