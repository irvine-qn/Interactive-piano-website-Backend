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

const getSheetById = async (id) => {
  const sheet = await sheetsRepository.findById(id);
  if (!sheet) {
    throw new ApiError(404, "SHEET_NOT_FOUND", `Sheet "${id}" not found`);
  }
  return sheet;
};

const listTags = async () => ({ data: await sheetsRepository.countTags() });

module.exports = { listSheets, getSheetById, listTags };
