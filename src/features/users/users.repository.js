const prisma = require("../../lib/prisma");

// Bảng users do migration Prisma quản lý (prisma/migrations/*_add_users).
// Giữ dạng row snake_case như khi còn dùng pg (SELECT *) để auth.service.js không phải đổi.
const toRow = (user) =>
  user && {
    id: user.id,
    username: user.username,
    email: user.email,
    password_hash: user.passwordHash,
    display_name: user.displayName,
    role: user.role,
    is_verified: user.isVerified,
    created_at: user.createdAt,
    bio: user.bio,
    city: user.city,
    country: user.country,
    instagram: user.instagram,
    level: user.level,
    favorite_genres: user.favoriteGenres,
    favorite_artists: user.favoriteArtists,
    show_practice_stats: user.showPracticeStats,
  };

const findByUsernameOrEmail = async (username, email) => {
  const users = await prisma.user.findMany({
    where: { OR: [{ username }, { email }] },
  });
  return users.map(toRow);
};

const findById = async (id) => {
  const user = await prisma.user.findUnique({ where: { id } });
  return toRow(user) || null;
};

const findByIdentifier = async (identifier) => {
  const user = await prisma.user.findFirst({
    where: { OR: [{ username: identifier }, { email: identifier }] },
  });
  return toRow(user) || null;
};

const createUser = async ({ displayName, username, email, passwordHash }) => {
  const user = await prisma.user.create({
    data: { username, email, passwordHash, displayName },
  });
  return toRow(user);
};

const updateProfile = async (id, data) => {
  try {
    return toRow(await prisma.user.update({ where: { id }, data }));
  } catch (error) {
    if (error.code === "P2025") return null;
    throw error;
  }
};

module.exports = {
  updateProfile,
  findByUsernameOrEmail,
  findById,
  findByIdentifier,
  createUser,
};
