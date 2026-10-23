const express = require("express");
const workspaceController = require("./workspace.controller");

const router = express.Router();

router.get("/piano", workspaceController.getPiano);
router.get("/frequencies", workspaceController.getFrequencies);

module.exports = router;
