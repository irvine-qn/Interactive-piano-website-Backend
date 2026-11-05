const jwt = require("jsonwebtoken");
const ApiError = require("../exceptions/ApiError");
const { JWT_SECRET } = require("../../config/env");

const readUserId = (req) => {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) return null;
  try {
    return Number(jwt.verify(token, JWT_SECRET).sub);
  } catch {
    return null;
  }
};

const requireAuth = (req, res, next) => {
  req.userId = readUserId(req);
  if (!req.userId) throw new ApiError(401, "UNAUTHORIZED", "Please log in to continue");
  next();
};

const optionalAuth = (req, res, next) => {
  req.userId = readUserId(req);
  next();
};

module.exports = { requireAuth, optionalAuth };
