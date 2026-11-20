const express = require("express");
const { rateLimit } = require("express-rate-limit");
const authController = require("./auth.controller");
const { requireAuth } = require("../../common/middlewares/auth.middleware");
const {
  AUTH_RATE_LIMIT_WINDOW_MINUTES,
  AUTH_RATE_LIMIT_MAX,
} = require("../../common/constants/auth.constants");

const router = express.Router();

const authLimiter = () =>
  rateLimit({
    windowMs: AUTH_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
    limit: AUTH_RATE_LIMIT_MAX,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: { code: "TOO_MANY_REQUESTS", message: "Too many requests. Please try again later." } },
  });

router.post("/register", authLimiter(), authController.register);
router.post("/login", authLimiter(), authController.login);
router.post("/forgot-password", authLimiter(), authController.forgotPassword);
router.post("/reset-password", authLimiter(), authController.resetPassword);
router.post("/verify-email", authLimiter(), authController.verifyEmail);
router.post("/verify-email/resend", authLimiter(), requireAuth, authController.resendVerification);

module.exports = router;
