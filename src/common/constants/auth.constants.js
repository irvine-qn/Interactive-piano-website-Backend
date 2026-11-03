const USERNAME_REGEX = /^[a-z0-9]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
const BCRYPT_SALT_ROUNDS = 10;

module.exports = {
  USERNAME_REGEX,
  EMAIL_REGEX,
  PASSWORD_REGEX,
  BCRYPT_SALT_ROUNDS,
};
