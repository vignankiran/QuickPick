const express = require("express");
const router = express.Router();

const {
  addToCart,
  getCart,
  getMyCarts,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require("../controllers/cartController");

const { protect } = require("../middleware/authMiddleware");

router.post("/add", protect, addToCart);
router.get("/my-carts", protect, getMyCarts);
router.get("/:shopId", protect, getCart);

router.put("/update", protect, updateCartItem);
router.delete("/remove", protect, removeCartItem);
router.delete("/clear", protect, clearCart);

module.exports = router;