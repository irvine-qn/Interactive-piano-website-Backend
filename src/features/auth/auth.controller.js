const authService = require("./auth.service");
const {
  parseRegisterBody,
  parseLoginBody,
  parseEmailBody,
  parseTokenBody,
  parseResetPasswordBody,
} = require("./auth.schema");

const register = async (req, res) => {
  res.status(201).json(await authService.register(parseRegisterBody(req.body)));
};

const login = async (req, res) => {
  res.json(await authService.login(parseLoginBody(req.body)));
};

const forgotPassword = async (req, res) => {
  res.json(await authService.forgotPassword(parseEmailBody(req.body)));
};

const resetPassword = async (req, res) => {
  res.json(await authService.resetPassword(parseResetPasswordBody(req.body)));
};

const verifyEmail = async (req, res) => {
  res.json(await authService.verifyEmail(parseTokenBody(req.body)));
};

const resendVerification = async (req, res) => {
  res.json(await authService.resendVerification(req.userId));
};

module.exports = { register, login, forgotPassword, resetPassword, verifyEmail, resendVerification };
