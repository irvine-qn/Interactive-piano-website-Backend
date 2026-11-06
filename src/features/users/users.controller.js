const usersService = require("./users.service");
const { parseProfileBody } = require("./users.schema");

const getMe = async (req, res) => {
  res.json(await usersService.getMe(req.userId));
};

const putProfile = async (req, res) => {
  res.json(await usersService.updateProfile(req.userId, parseProfileBody(req.body)));
};

const putImage = async (req, res) => {
  res.json(await usersService.uploadImage(req.userId, req.params.kind, req.file.buffer));
};

const deleteImage = async (req, res) => {
  res.json(await usersService.removeImage(req.userId, req.params.kind));
};

const getImage = async (req, res) => {
  const { data, mimeType } = await usersService.getImage(req.params.id, req.params.kind);
  res.type(mimeType).set("Cache-Control", "public, max-age=31536000, immutable").send(Buffer.from(data));
};

module.exports = { getMe, putProfile, putImage, deleteImage, getImage };
