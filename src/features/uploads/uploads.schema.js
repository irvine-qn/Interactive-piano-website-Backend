const ApiError = require("../../common/exceptions/ApiError");

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

module.exports = { parseTrackList };
