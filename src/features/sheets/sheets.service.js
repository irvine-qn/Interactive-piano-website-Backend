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

// Bài PRIVATE của người khác cũng báo 404 như bài không tồn tại, không để lộ là có bài này
const sheetNotFound = (id) => new ApiError(404, "SHEET_NOT_FOUND", `Sheet "${id}" not found`);

const getSheetById = async (id, userId) => {
  const sheet = await sheetsRepository.findById(id, userId);
  if (!sheet) throw sheetNotFound(id);
  return { ...sheet, chords: buildChords(sheet.notes) };
};

const getSheetScore = async (id, userId) => buildScore(await getSheetById(id, userId));

const listTags = async () => ({ data: await sheetsRepository.countTags() });

const recordView = async (id, userId) => {
  const result = await sheetsRepository.incrementViews(id, userId);
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

module.exports = { listSheets, getSheetById, getSheetScore, listTags, recordView, toggleLike };
