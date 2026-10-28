// Cấu hình Prisma CLI (migrate, generate, studio). Prisma 7 đọc URL DB ở đây thay vì trong schema.
require("dotenv/config");
const { defineConfig } = require("prisma/config");

module.exports = defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js",
  },
  datasource: {
    // Dùng process.env (không dùng env()) để `prisma generate` lúc npm install vẫn chạy khi chưa có .env
    url: process.env.DATABASE_URL,
  },
});
