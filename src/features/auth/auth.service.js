const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const ApiError = require("../../common/exceptions/ApiError");
const { BCRYPT_SALT_ROUNDS } = require("../../common/constants/auth.constants");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../../config/env");
const usersRepository = require("../users/users.repository");

const toPublicUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  displayName: user.display_name,
  role: user.role,
  isVerified: user.is_verified,
  createdAt: user.created_at,
});

const signAccessToken = (user) =>
  jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );

const register = async ({ displayName, username, email, password }) => {
  const existing = await usersRepository.findByUsernameOrEmail(username, email);
  if (existing.some((u) => u.username === username)) {
    throw new ApiError(409, "USERNAME_TAKEN", "Username already exists");
  }
  if (existing.some((u) => u.email === email)) {
    throw new ApiError(409, "EMAIL_TAKEN", "Email already exists");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const user = await usersRepository.createUser({
    displayName,
    username,
    email,
    passwordHash,
  });

  return { accessToken: signAccessToken(user), user: toPublicUser(user) };
};

const login = async ({ identifier, password }) => {
  const user = await usersRepository.findByIdentifier(identifier);
  const isValid = user && (await bcrypt.compare(password, user.password_hash));
  if (!isValid) {
    throw new ApiError(
      401,
      "INVALID_CREDENTIALS",
      "Invalid username/email or password",
    );
  }

  return { accessToken: signAccessToken(user), user: toPublicUser(user) };
};

module.exports = { register, login };
