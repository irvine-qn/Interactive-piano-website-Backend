// Nhận 1 file MIDI qua multipart/form-data (trường "file"), giữ trong RAM ở req.file.buffer.
// Các trường chữ khác của form nằm ở req.body. Dùng cho mọi route upload MIDI:
//   router.post("/uploads/midi/analyze", requireAuth, receiveMidiFile, controller)
// Chỉ kiểm tra "có phải file MIDI không"; đọc nội dung (file hỏng, quá nhiều nốt...) là việc của
// src/features/uploads/midiToSheet.js (lỗi 422 INVALID_MIDI, MIDI_TOO_LARGE...).
const path = require("path");
const multer = require("multer");
const ApiError = require("../exceptions/ApiError");

const FILE_FIELD = "file";
// File MIDI piano thường vài KB đến vài trăm KB (lớn nhất trong thư viện mẫu: 82 KB)
const MAX_MIDI_BYTES = 1024 * 1024;
const MIDI_EXTENSIONS = [".mid", ".midi"];
// Mọi file MIDI chuẩn bắt đầu bằng "MThd". Không tin mimetype trình duyệt gửi
// (mỗi trình duyệt một kiểu: audio/midi, audio/mid, application/octet-stream...)
const MIDI_HEADER = "MThd";

const midiMulter = multer({
  storage: multer.memoryStorage(),
  // Mặc định multer đọc tên file theo latin1 -> tên có dấu tiếng Việt bị lỗi font
  defParamCharset: "utf8",
  limits: {
    fileSize: MAX_MIDI_BYTES,
    files: 1,
    fields: 30, // title, composer, tags[]... của form tạo bài
    fieldSize: 16 * 1024,
  },
});

const fromMulterError = (error) => {
  switch (error.code) {
    case "LIMIT_FILE_SIZE":
      return new ApiError(413, "FILE_TOO_LARGE", "The MIDI file must be at most 1 MB.");
    case "LIMIT_FILE_COUNT":
    case "LIMIT_UNEXPECTED_FILE":
      return new ApiError(400, "UNEXPECTED_FILE", `Send exactly one MIDI file in the "${FILE_FIELD}" field.`);
    default:
      return new ApiError(400, "INVALID_UPLOAD", "The upload request is not valid.", { reason: error.code });
  }
};

const isMidiFile = (file) =>
  MIDI_EXTENSIONS.includes(path.extname(file.originalname).toLowerCase()) &&
  file.buffer.length >= MIDI_HEADER.length &&
  file.buffer.toString("latin1", 0, MIDI_HEADER.length) === MIDI_HEADER;

const receiveMidiFile = (req, res, next) => {
  midiMulter.single(FILE_FIELD)(req, res, (error) => {
    if (error) {
      // Lỗi khi đọc form (multipart hỏng, thiếu boundary...) là lỗi của request, không phải lỗi server
      return next(
        error instanceof multer.MulterError
          ? fromMulterError(error)
          : new ApiError(400, "INVALID_UPLOAD", "The upload request is not valid."),
      );
    }
    if (!req.file) {
      return next(new ApiError(400, "FILE_REQUIRED", "Please choose a MIDI file to upload."));
    }
    if (!isMidiFile(req.file)) {
      return next(new ApiError(415, "UNSUPPORTED_FILE", "Only MIDI files (.mid, .midi) can be uploaded."));
    }
    next();
  });
};

module.exports = { receiveMidiFile, MAX_MIDI_BYTES };
