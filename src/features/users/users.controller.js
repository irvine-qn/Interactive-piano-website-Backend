const usersService = require("./users.service");

const getMe = async (req, res) => {
  res.json(await usersService.getMe(req.userId));
};

module.exports = { getMe };
