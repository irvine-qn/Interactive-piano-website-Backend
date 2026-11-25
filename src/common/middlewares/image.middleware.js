// Nhận 1 ảnh qua multipart/form-data (trường "file"), giữ trong RAM ở req.file.buffer.
const multer = require("multer");
const ApiError = require("../exceptions/ApiError");

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const imageMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
});

const receiveImage = (req, res, next) => {
  imageMulter.single("file")(req, res, (error) => {
    if (error?.code === "LIMIT_FILE_SIZE") {
      return next(new ApiError(413, "FILE_TOO_LARGE", "The image must be at most 5 MB."));
    }
    if (error) return next(new ApiError(400, "INVALID_UPLOAD", "The upload request is not valid."));
    if (!req.file) return next(new ApiError(400, "FILE_REQUIRED", "Please choose an image to upload."));
    next();
  });
};

module.exports = { receiveImage };
