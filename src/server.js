const { PORT } = require("./config/env");
const app = require("./app");
const prisma = require("./lib/prisma");

const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Tắt server (Ctrl+C / docker stop): ngừng nhận request rồi đóng kết nối DB
const shutdown = (signal) => {
  console.log(`${signal} received, shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
