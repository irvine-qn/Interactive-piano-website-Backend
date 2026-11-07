require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  // Nơi lưu file MIDI gốc của bài upload (src/lib/fileStorage.js)
  FILE_STORAGE: process.env.FILE_STORAGE || "postgres",
};
