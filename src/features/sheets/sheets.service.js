const ApiError = require("../../common/exceptions/ApiError");
const sheetsRepository = require("./sheets.repository");
const { buildChords, buildScore } = require("./sheets.score");

const listSheets = async (query, userId) => {
  const { items, total } = await sheetsRepository.findMany(query, userId);
  return {
    data: items,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
};

const listLikedSheets = (query, userId) =>
  listSheets({ ...query, likedByUserId: userId }, userId);

const sheetNotFound = (id) => new ApiError(404, "SHEET_NOT_FOUND", `Sheet "${id}" not found`);

const getSheetById = async (id, userId) => {
  const sheet = await sheetsRepository.findById(id, userId);
  if (!sheet) throw sheetNotFound(id);
  return { ...sheet, chords: buildChords(sheet.notes) };
};

const getSheetScore = async (id) => buildScore(await getSheetById(id));

const listTags = async () => ({ data: await sheetsRepository.countTags() });

const recordView = async (id) => {
  const result = await sheetsRepository.incrementViews(id);
  if (!result) throw sheetNotFound(id);
  return result;
};

const toggleLike = async (id, userId) => {
  try {
    const result = await sheetsRepository.toggleLike(id, userId);
    if (!result) throw sheetNotFound(id);
    return result;
  } catch (error) {
    if (error.code === "P2003") throw new ApiError(401, "UNAUTHORIZED", "Please log in to continue");
    throw error;
  }
};

const recordPracticeSession = async (id, userId, data) => {
  try {
    const session = await sheetsRepository.createPracticeSession(id, userId, data);
    if (!session) throw sheetNotFound(id);
    return session;
  } catch (error) {
    if (error.code === "P2003") throw new ApiError(401, "UNAUTHORIZED", "Please log in to continue");
    throw error;
  }
};

const listPracticeHistory = async (userId, query) => {
  const { items, total } = await sheetsRepository.findPracticeHistory(userId, query);
  return {
    data: items,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
};

module.exports = { recordPracticeSession, listPracticeHistory, listSheets, listLikedSheets, getSheetById, getSheetScore, listTags, recordView, toggleLike };
