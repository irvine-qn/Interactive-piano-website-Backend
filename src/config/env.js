require("dotenv").config();

// "https://a.com, https://b.com" -> ["https://a.com", "https://b.com"]; bỏ trống -> []
const toList = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

module.exports = {
  PORT: process.env.PORT || 5000,
  // Domain Frontend được gọi API từ trình duyệt (src/app.js). Bỏ trống thì cho mọi domain (chỉ dùng khi chạy local)
  CORS_ORIGINS: toList(process.env.CORS_ORIGIN),
  // Số proxy đứng trước server (Railway: 1). 0 = không tin header X-Forwarded-For (chạy local)
  TRUST_PROXY: Number(process.env.TRUST_PROXY) || 0,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  // Nơi lưu file MIDI gốc của bài upload (src/lib/fileStorage.js)
  FILE_STORAGE: process.env.FILE_STORAGE || "postgres",
  NODE_ENV: process.env.NODE_ENV || "development",
  APP_URL: process.env.APP_URL || "http://localhost:5173",
  // Gửi email qua HTTP API của Resend (src/lib/mailer.js). Có key thì ưu tiên hơn SMTP
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  MAIL_FROM: process.env.MAIL_FROM || "Fiano <no-reply@fiano.local>",
};
