const express = require("express");
const router = express.Router();

const {
  createItem,
  getItemsByShop,
} = require("../controllers/itemController");

const { protect, ownerOnly } = require("../middleware/authMiddleware");

router.post("/", protect, ownerOnly, createItem);
router.get("/shop/:shopId", getItemsByShop);
module.exports = router;