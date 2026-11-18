const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const ApiError = require("../../common/exceptions/ApiError");
const {
  BCRYPT_SALT_ROUNDS,
  PASSWORD_RESET_TTL_MINUTES,
  EMAIL_VERIFY_TTL_HOURS,
} = require("../../common/constants/auth.constants");
const { JWT_SECRET, JWT_EXPIRES_IN, APP_URL } = require("../../config/env");
const { sendMail } = require("../../lib/mailer");
const usersRepository = require("../users/users.repository");
const authRepository = require("./auth.repository");

const RESET_EMAIL_SENT_MESSAGE = "If this email is registered, a password reset link has been sent.";

const toPublicUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  displayName: user.display_name,
  role: user.role,
  isVerified: user.is_verified,
  createdAt: user.created_at,
  bio: user.bio,
  city: user.city,
  country: user.country,
  instagram: user.instagram,
  level: user.level,
  favoriteGenres: user.favorite_genres,
  favoriteArtists: user.favorite_artists,
  showPracticeStats: user.show_practice_stats,
  avatarUrl: user.avatar_url,
  backgroundUrl: user.background_url,
});

const signAccessToken = (user) =>
  jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const issueToken = async (userId, type, ttlMs) => {
  const token = crypto.randomBytes(32).toString("base64url");
  await authRepository.replaceToken({
    userId,
    type,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + ttlMs),
  });
  return token;
};

const invalidLink = () => new ApiError(400, "INVALID_TOKEN", "This link is invalid or has expired");

const sendVerificationEmail = async (user) => {
  const token = await issueToken(user.id, "EMAIL_VERIFY", EMAIL_VERIFY_TTL_HOURS * 60 * 60 * 1000);
  await sendMail({
    to: user.email,
    subject: "Verify your Fiano email",
    text: `Open this link to verify your email:\n${APP_URL}/verify-email?token=${token}\n\nThe link expires in ${EMAIL_VERIFY_TTL_HOURS} hours.`,
  });
};

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

  sendVerificationEmail(user).catch((error) => console.error("Unable to send verification email", error));

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

const resendVerification = async (userId) => {
  const user = await usersRepository.findById(userId);
  if (!user) throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  if (user.is_verified) throw new ApiError(409, "ALREADY_VERIFIED", "Email is already verified");
  await sendVerificationEmail(user);
  return { message: "A verification link has been sent to your email." };
};

const verifyEmail = async ({ token }) => {
  const record = await authRepository.findValidToken(hashToken(token), "EMAIL_VERIFY");
  if (!record || !(await authRepository.useToken(record, { isVerified: true }))) throw invalidLink();
  return { message: "Your email has been verified." };
};

const forgotPassword = async ({ email }) => {
  const user = await usersRepository.findByIdentifier(email);
  if (!user) return { message: RESET_EMAIL_SENT_MESSAGE };
  if (!user.is_verified) {
    throw new ApiError(403, "EMAIL_NOT_VERIFIED", "This account's email has not been verified");
  }
  const token = await issueToken(user.id, "PASSWORD_RESET", PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
  await sendMail({
    to: user.email,
    subject: "Reset your Fiano password",
    text: `Open this link to set a new password:\n${APP_URL}/reset-password?token=${token}\n\nThe link expires in ${PASSWORD_RESET_TTL_MINUTES} minutes. If you did not ask for this, you can ignore this email.`,
  });
  return { message: RESET_EMAIL_SENT_MESSAGE };
};

const resetPassword = async ({ token, password }) => {
  const record = await authRepository.findValidToken(hashToken(token), "PASSWORD_RESET");
  if (!record) throw invalidLink();
  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  if (!(await authRepository.useToken(record, { passwordHash }))) throw invalidLink();
  return { message: "Your password has been updated. You can log in now." };
};

module.exports = {
  register,
  login,
  toPublicUser,
  resendVerification,
  verifyEmail,
  forgotPassword,
  resetPassword,
};
