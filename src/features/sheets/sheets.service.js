const ApiError = require("../../common/exceptions/ApiError");
const sheetsRepository = require("./sheets.repository");

const listSheets = async (query) => {
  const { items, total } = await sheetsRepository.findMany(query);
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

const sheetNotFound = (id) => new ApiError(404, "SHEET_NOT_FOUND", `Sheet "${id}" not found`);

const getSheetById = async (id) => {
  const sheet = await sheetsRepository.findById(id);
  if (!sheet) throw sheetNotFound(id);
  return sheet;
};

const listTags = async () => ({ data: await sheetsRepository.countTags() });

const recordView = async (id) => {
  const result = await sheetsRepository.incrementViews(id);
  if (!result) throw sheetNotFound(id);
  return result;
};

module.exports = { listSheets, getSheetById, listTags, recordView };
