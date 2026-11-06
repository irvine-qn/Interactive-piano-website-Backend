const uploadsService = require("./uploads.service");
const { parseTrackList } = require("./uploads.schema");

// req.file do receiveMidiFile (upload.middleware.js) đặt vào; req.body.tracks (tuỳ chọn) là các track đang chọn
const analyzeMidi = (req, res) => {
  res.json(uploadsService.analyzeMidi(req.file, { tracks: parseTrackList(req.body?.tracks) }));
};

module.exports = { analyzeMidi };
