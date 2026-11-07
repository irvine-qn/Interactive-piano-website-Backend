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
    avatar_url: user.avatarUrl,
    background_url: user.backgroundUrl,
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

const findImage = (userId, kind) =>
  prisma.userImage.findUnique({ where: { userId_kind: { userId, kind } } });

// Ảnh và URL đổi cùng lúc
const saveImage = async (userId, kind, image, urlData) => {
  try {
    const [, user] = await prisma.$transaction([
      prisma.userImage.upsert({
        where: { userId_kind: { userId, kind } },
        create: { userId, kind, ...image },
        update: image,
      }),
      prisma.user.update({ where: { id: userId }, data: urlData }),
    ]);
    return toRow(user);
  } catch (error) {
    if (["P2003", "P2025"].includes(error.code)) return null;
    throw error;
  }
};

const deleteImage = async (userId, kind, urlData) => {
  try {
    const [, user] = await prisma.$transaction([
      prisma.userImage.deleteMany({ where: { userId, kind } }),
      prisma.user.update({ where: { id: userId }, data: urlData }),
    ]);
    return toRow(user);
  } catch (error) {
    if (error.code === "P2025") return null;
    throw error;
  }
};

module.exports = {
  findImage,
  saveImage,
  deleteImage,
  updateProfile,
  findByUsernameOrEmail,
  findById,
  findByIdentifier,
  createUser,
};
