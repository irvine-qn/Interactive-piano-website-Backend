const pool = require("../../config/database");
const {
  USERNAME_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
} = require("../../common/constants/auth.constants");

const createUsersTable = () =>
  pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(${USERNAME_MAX_LENGTH}) UNIQUE NOT NULL,
      email VARCHAR(${EMAIL_MAX_LENGTH}) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      display_name VARCHAR(${DISPLAY_NAME_MAX_LENGTH}),
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      is_verified BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

const findByUsernameOrEmail = async (username, email) => {
  const { rows } = await pool.query(
    "SELECT * FROM users WHERE username = $1 OR email = $2",
    [username, email],
  );
  return rows;
};

const findByIdentifier = async (identifier) => {
  const { rows } = await pool.query(
    "SELECT * FROM users WHERE username = $1 OR email = $1 LIMIT 1",
    [identifier],
  );
  return rows[0] || null;
};

const createUser = async ({ displayName, username, email, passwordHash }) => {
  const { rows } = await pool.query(
    "INSERT INTO users (username, email, password_hash, display_name) VALUES ($1, $2, $3, $4) RETURNING *",
    [username, email, passwordHash, displayName],
  );
  return rows[0];
};

module.exports = {
  createUsersTable,
  findByUsernameOrEmail,
  findByIdentifier,
  createUser,
};
