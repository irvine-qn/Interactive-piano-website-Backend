const express = require("express");
const cors = require("cors");
const workspaceRoutes = require("./features/workspace/workspace.routes");
const sheetsRoutes = require("./features/sheets/sheets.routes");
const { notFoundHandler, errorHandler } = require("./common/middlewares/error.middleware");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Piano Backend is running!",
  });
});

app.use("/api", workspaceRoutes);
app.use("/api", sheetsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
