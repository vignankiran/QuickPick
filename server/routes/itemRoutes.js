const express = require("express");
const router = express.Router();

const {
  createItem,
  getItemsByShop,
  updateItem,
} = require("../controllers/itemController");

const { protect, ownerOnly } = require("../middleware/authMiddleware");

router.post("/", protect, ownerOnly, createItem);
router.get("/shop/:shopId", getItemsByShop);
router.put("/:itemId", protect, ownerOnly, updateItem);


module.exports = router;