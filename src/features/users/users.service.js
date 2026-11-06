const ApiError = require("../../common/exceptions/ApiError");
const { toPublicUser } = require("../auth/auth.service");
const usersRepository = require("./users.repository");

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

module.exports = { getMe, updateProfile };
