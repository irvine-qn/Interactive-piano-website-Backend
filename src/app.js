const express = require("express");
const cors = require("cors");
const workspaceRoutes = require("./features/workspace/workspace.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Piano Backend is running!",
  });
});

app.use("/api", workspaceRoutes);

module.exports = app;
