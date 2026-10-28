const sheetsService = require("./sheets.service");
const { parseListQuery } = require("./sheets.schema");

// Express 5 tự chuyển lỗi của hàm async sang error middleware
const getSheets = async (req, res) => {
  res.json(await sheetsService.listSheets(parseListQuery(req.query)));
};

const getSheet = async (req, res) => {
  res.json(await sheetsService.getSheetById(req.params.id));
};

const getTags = async (req, res) => {
  res.json(await sheetsService.listTags());
};

module.exports = { getSheets, getSheet, getTags };
