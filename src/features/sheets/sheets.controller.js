const sheetsService = require("./sheets.service");
const { parseListQuery } = require("./sheets.schema");

const getSheets = (req, res) => {
  res.json(sheetsService.listSheets(parseListQuery(req.query)));
};

const getSheet = (req, res) => {
  res.json(sheetsService.getSheetById(req.params.id));
};

module.exports = { getSheets, getSheet };
