const express = require("express");
const router = express.Router();

const {
  createItem,
  getItemsByShop,
  updateItem,
  deleteItem,
} = require("../controllers/itemController");

const { protect, ownerOnly } = require("../middleware/authMiddleware");

router.post("/", protect, ownerOnly, createItem);
router.get("/shop/:shopId", getItemsByShop);
router.put("/:itemId", protect, ownerOnly, updateItem);
router.delete("/:itemId", protect, ownerOnly, deleteItem);

module.exports = router;