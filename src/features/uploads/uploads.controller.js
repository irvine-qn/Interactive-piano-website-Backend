const uploadsService = require("./uploads.service");
const { parseTrackList, parseSheetFields, parseUserId } = require("./uploads.schema");
const { parseListQuery } = require("../sheets/sheets.schema");

// req.file do receiveMidiFile (upload.middleware.js) đặt vào; req.body.tracks (tuỳ chọn) là các track đang chọn
const analyzeMidi = (req, res) => {
  res.json(uploadsService.analyzeMidi(req.file, { tracks: parseTrackList(req.body?.tracks) }));
};

// Express 5 tự chuyển lỗi của hàm async sang error middleware
const createSheet = async (req, res) => {
  res.status(201).json(await uploadsService.createSheet(req.file, parseSheetFields(req.body), req.userId));
};

// Query giống GET /sheets (q, difficulty, tag, sort, page, pageSize), nhưng mặc định mới nhất trước
const parseUploadsQuery = (query) => parseListQuery({ ...query, sort: query.sort || "newest" });

const getMySheets = async (req, res) => {
  res.json(await uploadsService.listMySheets(parseUploadsQuery(req.query), req.userId));
};

const getUserSheets = async (req, res) => {
  res.json(await uploadsService.listUserSheets(parseUserId(req.params.id), parseUploadsQuery(req.query), req.userId));
};

module.exports = { analyzeMidi, createSheet, getMySheets, getUserSheets };
