const express = require("express");
const usersController = require("./users.controller");
const { requireAuth } = require("../../common/middlewares/auth.middleware");

const router = express.Router();

router.get("/me", requireAuth, usersController.getMe);
router.put("/profile", requireAuth, usersController.putProfile);

module.exports = router;
