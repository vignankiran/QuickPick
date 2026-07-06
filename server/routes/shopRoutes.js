const express = require("express");
const router = express.Router();

const { createShop, getShops, updateShop } = require("../controllers/shopController");
const { protect, ownerOnly } = require("../middleware/authMiddleware");

// Create a shop (Owner only - for now any authenticated user)
// router.post("/", protect, createShop);
router.post("/", protect, ownerOnly, createShop);
router.put("/:id", protect, ownerOnly, updateShop);
router.get("/", getShops);
// router.put("/:id", protect, updateShop);
module.exports = router;