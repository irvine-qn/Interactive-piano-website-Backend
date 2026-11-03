const ApiError = require("../../common/exceptions/ApiError");
const {
  USERNAME_REGEX,
  EMAIL_REGEX,
  PASSWORD_REGEX,
} = require("../../common/constants/auth.constants");

const requireString = (value, field) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(422, "VALIDATION_FAILED", `${field} is required`);
  }
  return value.trim();
};

const parseRegisterBody = (body = {}) => {
  const displayName = requireString(body.displayName, "displayName");
  const username = requireString(body.username, "username");
  const email = requireString(body.email, "email").toLowerCase();
  const password = requireString(body.password, "password");

  if (displayName.length > 100) {
    throw new ApiError(422, "VALIDATION_FAILED", "displayName must be at most 100 characters");
  }
  if (!USERNAME_REGEX.test(username)) {
    throw new ApiError(
      422,
      "VALIDATION_FAILED",
      "username must contain only lowercase letters and digits",
    );
  }
  if (!EMAIL_REGEX.test(email)) {
    throw new ApiError(422, "VALIDATION_FAILED", "email is invalid");
  }
  if (!PASSWORD_REGEX.test(password)) {
    throw new ApiError(
      422,
      "VALIDATION_FAILED",
      "password must be at least 8 characters with at least 1 uppercase letter and 1 digit",
    );
  }

  return { displayName, username, email, password };
};

const parseLoginBody = (body = {}) => ({
  identifier: requireString(body.identifier, "identifier").toLowerCase(),
  password: requireString(body.password, "password"),
});

module.exports = { parseRegisterBody, parseLoginBody };
