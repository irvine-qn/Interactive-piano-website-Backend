const workspaceService = require("./workspace.service");

const getPiano = (req, res) => {
  res.json(workspaceService.getPianoConfig());
};

const getFrequencies = (req, res) => {
  res.json(workspaceService.getFrequencies());
};

module.exports = {
  getPiano,
  getFrequencies,
};
