const express = require("express");
const cors = require("cors");
const workspaceRoutes = require("./features/workspace/workspace.routes");
const sheetsRoutes = require("./features/sheets/sheets.routes");
const authRoutes = require("./features/auth/auth.routes");
const uploadsRoutes = require("./features/uploads/uploads.routes");
const {
  notFoundHandler,
  errorHandler,
} = require("./common/middlewares/error.middleware");

const app = express();

app.use(cors());
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

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
