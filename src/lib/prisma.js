const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { DATABASE_URL } = require("../config/env");

// Dùng chung một PrismaClient cho toàn app. Prisma 7 bắt buộc kết nối qua driver adapter (pg).
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: DATABASE_URL }),
});

module.exports = prisma;
