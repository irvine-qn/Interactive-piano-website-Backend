const ApiError = require("../exceptions/ApiError");

const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, "NOT_FOUND", `Route ${req.method} ${req.originalUrl} not found`));
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }
  console.error(err);
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Internal server error" },
  });
};

module.exports = { notFoundHandler, errorHandler };
