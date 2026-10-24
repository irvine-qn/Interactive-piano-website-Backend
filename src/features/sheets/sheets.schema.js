const ApiError = require("../../common/exceptions/ApiError");
const { MAX_PAGE_SIZE, DIFFICULTIES, SORT_OPTIONS } = require("../../common/constants/sheet.constants");

const toPositiveInt = (value, fallback, field) => {
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new ApiError(422, "VALIDATION_FAILED", `${field} must be a positive integer`);
  }
  return n;
};

const parseListQuery = (query) => {
  const { q, difficulty, sort } = query;

  if (q !== undefined && typeof q !== "string") {
    throw new ApiError(422, "VALIDATION_FAILED", "q must be a string");
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
    sort: sort || "newest",
    page: toPositiveInt(query.page, 1, "page"),
    pageSize: Math.min(toPositiveInt(query.pageSize, 8, "pageSize"), MAX_PAGE_SIZE),
  };
};

module.exports = { parseListQuery };
