const sharp = require("sharp");
const ApiError = require("../../common/exceptions/ApiError");

const IMAGE_MIME_TYPE = "image/webp";

const IMAGE_KINDS = {
  avatar: { urlField: "avatarUrl", resize: { width: 512, height: 512, fit: "cover" } },
  background: { urlField: "backgroundUrl", resize: { width: 1600, withoutEnlargement: true } },
};

// Không tin đuôi file hay mimetype: sharp đọc được nội dung thì mới là ảnh
const processImage = async (kind, buffer) => {
  try {
    return await sharp(buffer).rotate().resize(IMAGE_KINDS[kind].resize).webp({ quality: 85 }).toBuffer();
  } catch {
    throw new ApiError(415, "UNSUPPORTED_IMAGE", "Please choose a valid image file.");
  }
};

module.exports = { IMAGE_KINDS, IMAGE_MIME_TYPE, processImage };
