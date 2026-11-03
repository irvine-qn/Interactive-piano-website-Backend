const authService = require("./auth.service");
const { parseRegisterBody, parseLoginBody } = require("./auth.schema");

const register = async (req, res) => {
  res.status(201).json(await authService.register(parseRegisterBody(req.body)));
};

const login = async (req, res) => {
  res.json(await authService.login(parseLoginBody(req.body)));
};

module.exports = { register, login };
