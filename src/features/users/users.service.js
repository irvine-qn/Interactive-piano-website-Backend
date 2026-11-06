const ApiError = require("../../common/exceptions/ApiError");
const { toPublicUser } = require("../auth/auth.service");
const usersRepository = require("./users.repository");
const { IMAGE_KINDS, IMAGE_MIME_TYPE, processImage } = require("./users.images");

const getMe = async (userId) => {
  const user = await usersRepository.findById(userId);
  if (!user) {
    throw new ApiError(401, "UNAUTHORIZED", "Please log in to continue");
  }
  return toPublicUser(user);
};

const updateProfile = async (userId, data) => {
  const user = await usersRepository.updateProfile(userId, data);
  if (!user) {
    throw new ApiError(401, "UNAUTHORIZED", "Please log in to continue");
  }
  return toPublicUser(user);
};

const imageNotFound = () => new ApiError(404, "IMAGE_NOT_FOUND", "Image not found");

const getImageConfig = (kind) => {
  if (!Object.hasOwn(IMAGE_KINDS, kind)) throw imageNotFound();
  return IMAGE_KINDS[kind];
};

const requireUser = (user) => {
  if (!user) throw new ApiError(401, "UNAUTHORIZED", "Please log in to continue");
  return toPublicUser(user);
};

// ?v= đổi mỗi lần tải ảnh mới để trình duyệt không dùng ảnh cũ trong cache
const uploadImage = async (userId, kind, buffer) => {
  const { urlField } = getImageConfig(kind);
  const data = await processImage(kind, buffer);
  const url = `/api/v1/users/${userId}/images/${kind}?v=${Date.now()}`;
  return requireUser(
    await usersRepository.saveImage(userId, kind, { data, mimeType: IMAGE_MIME_TYPE }, { [urlField]: url }),
  );
};

const removeImage = async (userId, kind) => {
  const { urlField } = getImageConfig(kind);
  return requireUser(await usersRepository.deleteImage(userId, kind, { [urlField]: null }));
};

const getImage = async (userId, kind) => {
  getImageConfig(kind);
  if (!/^[1-9]\d{0,8}$/.test(userId)) throw imageNotFound();
  const image = await usersRepository.findImage(Number(userId), kind);
  if (!image) throw imageNotFound();
  return image;
};

module.exports = { getMe, updateProfile, uploadImage, removeImage, getImage };
