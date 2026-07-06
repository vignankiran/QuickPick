const express = require("express");
const router = express.Router();

const {
  createCategory,
  getCategoriesByShop,
} = require("../controllers/categoryController");


const { protect, ownerOnly } = require("../middleware/authMiddleware");

router.post("/", protect, ownerOnly, createCategory);
router.get("/shop/:shopId", getCategoriesByShop);
module.exports = router;