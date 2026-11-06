const uploadsService = require("./uploads.service");
const { parseTrackList, parseSheetFields } = require("./uploads.schema");

// req.file do receiveMidiFile (upload.middleware.js) đặt vào; req.body.tracks (tuỳ chọn) là các track đang chọn
const analyzeMidi = (req, res) => {
  res.json(uploadsService.analyzeMidi(req.file, { tracks: parseTrackList(req.body?.tracks) }));
};

// Express 5 tự chuyển lỗi của hàm async sang error middleware
const createSheet = async (req, res) => {
  res.status(201).json(await uploadsService.createSheet(req.file, parseSheetFields(req.body), req.userId));
};

module.exports = { analyzeMidi, createSheet };
