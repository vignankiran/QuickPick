const express = require("express");
const router = express.Router();

const {
  createCategory,
  getCategoriesByShop,
  deleteCategory,
} = require("../controllers/categoryController");

const { protect, ownerOnly } = require("../middleware/authMiddleware");

router.post("/", protect, ownerOnly, createCategory);
router.get("/shop/:shopId", getCategoriesByShop);
router.delete("/:categoryId", protect, ownerOnly, deleteCategory);
module.exports = router;