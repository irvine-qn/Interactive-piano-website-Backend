const usersService = require("./users.service");
const { parseProfileBody } = require("./users.schema");

const getMe = async (req, res) => {
  res.json(await usersService.getMe(req.userId));
};

const putProfile = async (req, res) => {
  res.json(await usersService.updateProfile(req.userId, parseProfileBody(req.body)));
};

module.exports = { getMe, putProfile };
