require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  // Nơi lưu file MIDI gốc của bài upload (src/lib/fileStorage.js)
  FILE_STORAGE: process.env.FILE_STORAGE || "postgres",
  NODE_ENV: process.env.NODE_ENV || "development",
  APP_URL: process.env.APP_URL || "http://localhost:5173",
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  MAIL_FROM: process.env.MAIL_FROM || "Fiano <no-reply@fiano.local>",
};
