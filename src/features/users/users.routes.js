const express = require("express");
const usersController = require("./users.controller");
const { requireAuth } = require("../../common/middlewares/auth.middleware");
const { receiveImage } = require("../../common/middlewares/image.middleware");

const router = express.Router();

router.get("/me", requireAuth, usersController.getMe);
router.put("/profile", requireAuth, usersController.putProfile);
router.put("/profile/images/:kind", requireAuth, receiveImage, usersController.putImage);
router.delete("/profile/images/:kind", requireAuth, usersController.deleteImage);
router.get("/:id/images/:kind", usersController.getImage);

module.exports = router;
