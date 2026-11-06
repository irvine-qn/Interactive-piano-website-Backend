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

module.exports = { getMe };
