const express = require("express");
const router = express.Router();

const {
  register,
  login,
  getMe,
  devResetPassword,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");
router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.put("/dev-reset-password", devResetPassword);

module.exports = router;