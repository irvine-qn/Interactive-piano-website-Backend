const express = require("express");
const cors = require("cors");
const { NODE_ENV, CORS_ORIGINS, TRUST_PROXY } = require("./config/env");
const workspaceRoutes = require("./features/workspace/workspace.routes");
const sheetsRoutes = require("./features/sheets/sheets.routes");
const authRoutes = require("./features/auth/auth.routes");
const uploadsRoutes = require("./features/uploads/uploads.routes");
const usersRoutes = require("./features/users/users.routes");
const {
  notFoundHandler,
  errorHandler,
} = require("./common/middlewares/error.middleware");

// Production phải chỉ rõ domain Frontend, không để mọi trang web gọi API bằng token của người dùng
if (CORS_ORIGINS.length === 0 && NODE_ENV === "production") {
  throw new Error("Missing required environment variable CORS_ORIGIN");
}

const app = express();

// Sau proxy (Railway), IP thật của người dùng nằm trong X-Forwarded-For. Không bật thì rate limit
// (auth.routes.js) thấy mọi request cùng một IP của proxy và chặn chung tất cả người dùng.
if (TRUST_PROXY > 0) app.set("trust proxy", TRUST_PROXY);

// Không đặt CORS_ORIGIN (local) thì cho mọi domain, để mở FE bằng IP mạng LAN trên điện thoại vẫn gọi được
app.use(cors(CORS_ORIGINS.length > 0 ? { origin: CORS_ORIGINS } : undefined));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Piano Backend is running!",
  });
});

app.use("/api/v1", workspaceRoutes);
app.use("/api/v1", sheetsRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1", uploadsRoutes);
app.use("/api/v1/users", usersRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
