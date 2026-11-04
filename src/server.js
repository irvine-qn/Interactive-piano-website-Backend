const { PORT } = require("./config/env");
const app = require("./app");
const prisma = require("./lib/prisma");
const pool = require("./config/database");
// Tạm thời: bảng users vẫn do Auth tự tạo lúc khởi động, sẽ chuyển sang migration Prisma ở task C-07
const { createUsersTable } = require("./features/users/users.repository");

const start = async () => {
  await createUsersTable();

  const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });

  // Tắt server (Ctrl+C / docker stop): ngừng nhận request rồi đóng kết nối DB
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await Promise.allSettled([prisma.$disconnect(), pool.end()]);
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

start().catch((err) => {
  console.error("Failed to connect to database:", err.message);
  process.exit(1);
});
