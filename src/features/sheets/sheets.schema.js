const ApiError = require("../../common/exceptions/ApiError");
const {
  MAX_PAGE_SIZE,
  DIFFICULTIES,
  SORT_OPTIONS,
  DEFAULT_SORT,
  PRACTICE_MIN_NOTES,
  PRACTICE_MAX_NOTES,
  PRACTICE_MAX_DURATION_SEC,
} = require("../../common/constants/sheet.constants");

const toPositiveInt = (value, fallback, field) => {
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new ApiError(422, "VALIDATION_FAILED", `${field} must be a positive integer`);
  }
  return n;
};

const parseListQuery = (query) => {
  const { q, difficulty, tag, sort } = query;

  if (q !== undefined && typeof q !== "string") {
    throw new ApiError(422, "VALIDATION_FAILED", "q must be a string");
  }
  if (tag !== undefined && typeof tag !== "string") {
    throw new ApiError(422, "VALIDATION_FAILED", "tag must be a string");
  }
  if (difficulty !== undefined && !DIFFICULTIES.includes(difficulty)) {
    throw new ApiError(422, "VALIDATION_FAILED", `difficulty must be one of: ${DIFFICULTIES.join(", ")}`);
  }
  if (sort !== undefined && !SORT_OPTIONS.includes(sort)) {
    throw new ApiError(422, "VALIDATION_FAILED", `sort must be one of: ${SORT_OPTIONS.join(", ")}`);
  }

  return {
    q: typeof q === "string" ? q.trim().toLowerCase() : "",
    difficulty,
    // Tag so khớp chính xác (phân biệt hoa thường), lấy giá trị từ GET /sheets/tags
    tag: typeof tag === "string" && tag.trim() ? tag.trim() : undefined,
    sort: sort || DEFAULT_SORT,
    page: toPositiveInt(query.page, 1, "page"),
    pageSize: Math.min(toPositiveInt(query.pageSize, 8, "pageSize"), MAX_PAGE_SIZE),
  };
};

const parsePageQuery = (query) => ({
  page: toPositiveInt(query.page, 1, "page"),
  pageSize: Math.min(toPositiveInt(query.pageSize, 8, "pageSize"), MAX_PAGE_SIZE),
});

const parsePracticeBody = (body = {}) => {
  const { noteCount, durationSec } = body;
  if (!Number.isInteger(noteCount) || noteCount < PRACTICE_MIN_NOTES || noteCount > PRACTICE_MAX_NOTES) {
    throw new ApiError(
      422,
      "VALIDATION_FAILED",
      `noteCount must be an integer from ${PRACTICE_MIN_NOTES} to ${PRACTICE_MAX_NOTES}`,
    );
  }
  if (!Number.isInteger(durationSec) || durationSec < 0 || durationSec > PRACTICE_MAX_DURATION_SEC) {
    throw new ApiError(
      422,
      "VALIDATION_FAILED",
      `durationSec must be an integer from 0 to ${PRACTICE_MAX_DURATION_SEC}`,
    );
  }
  return { noteCount, durationSec };
};

module.exports = { parseListQuery, parsePageQuery, parsePracticeBody };
