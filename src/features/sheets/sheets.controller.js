const sheetsService = require("./sheets.service");
const { parseListQuery } = require("./sheets.schema");

// Express 5 tự chuyển lỗi của hàm async sang error middleware
const getSheets = async (req, res) => {
  res.json(await sheetsService.listSheets(parseListQuery(req.query), req.userId));
};

const getSheet = async (req, res) => {
  res.json(await sheetsService.getSheetById(req.params.id, req.userId));
};

const getTags = async (req, res) => {
  res.json(await sheetsService.listTags());
};

const postView = async (req, res) => {
  res.json(await sheetsService.recordView(req.params.id));
};

const postLike = async (req, res) => {
  res.json(await sheetsService.toggleLike(req.params.id, req.userId));
};

module.exports = { getSheets, getSheet, getTags, postView, postLike };
