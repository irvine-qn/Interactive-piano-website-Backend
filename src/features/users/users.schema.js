const ApiError = require("../../common/exceptions/ApiError");
const { DISPLAY_NAME_MAX_LENGTH } = require("../../common/constants/auth.constants");
const {
  BIO_MAX_LENGTH,
  LOCATION_MAX_LENGTH,
  INSTAGRAM_REGEX,
  LEVELS,
  FAVORITES_MAX_ITEMS,
  FAVORITE_MAX_LENGTH,
} = require("../../common/constants/profile.constants");

const fail = (message) => new ApiError(422, "VALIDATION_FAILED", message);

const parseOptionalText = (value, field, maxLength) => {
  if (value === undefined || value === null) return value;
  if (typeof value !== "string") throw fail(`${field} must be a string`);
  const text = value.trim();
  if (text.length > maxLength) throw fail(`${field} must be at most ${maxLength} characters`);
  return text || null;
};

const parseDisplayName = (value) => {
  const displayName = parseOptionalText(value, "displayName", DISPLAY_NAME_MAX_LENGTH);
  if (!displayName) throw fail("displayName is required");
  return displayName;
};

const parseInstagram = (value) => {
  const text = typeof value === "string" ? value.trim().replace(/^@/, "") : value;
  if (text === undefined || text === null || text === "") return text === "" ? null : text;
  if (typeof text !== "string" || !INSTAGRAM_REGEX.test(text)) {
    throw fail("instagram must be a valid Instagram username");
  }
  return text;
};

const parseLevel = (value) => {
  if (value === undefined || value === null) return value;
  if (value === "") return null;
  if (!LEVELS.includes(value)) throw fail(`level must be one of: ${LEVELS.join(", ")}`);
  return value;
};

const parseFavorites = (value, field) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw fail(`${field} must be an array of strings`);
  }
  const items = [...new Set(value.map((item) => item.trim()).filter(Boolean))];
  if (items.length > FAVORITES_MAX_ITEMS) {
    throw fail(`${field} must have at most ${FAVORITES_MAX_ITEMS} items`);
  }
  if (items.some((item) => item.length > FAVORITE_MAX_LENGTH)) {
    throw fail(`${field} items must be at most ${FAVORITE_MAX_LENGTH} characters`);
  }
  return items;
};

const parseShowPracticeStats = (value) => {
  if (value !== undefined && typeof value !== "boolean") {
    throw fail("showPracticeStats must be a boolean");
  }
  return value;
};

const parseProfileBody = (body = {}) => ({
  displayName: parseDisplayName(body.displayName),
  bio: parseOptionalText(body.bio, "bio", BIO_MAX_LENGTH),
  city: parseOptionalText(body.city, "city", LOCATION_MAX_LENGTH),
  country: parseOptionalText(body.country, "country", LOCATION_MAX_LENGTH),
  instagram: parseInstagram(body.instagram),
  level: parseLevel(body.level),
  favoriteGenres: parseFavorites(body.favoriteGenres, "favoriteGenres"),
  favoriteArtists: parseFavorites(body.favoriteArtists, "favoriteArtists"),
  showPracticeStats: parseShowPracticeStats(body.showPracticeStats),
});

module.exports = { parseProfileBody };
