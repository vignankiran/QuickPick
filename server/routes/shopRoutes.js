const express = require("express");
const router = express.Router();

const { createShop, getShops, updateShop } = require("../controllers/shopController");
const { protect, ownerOnly } = require("../middleware/authMiddleware");

 
router.post("/", protect, ownerOnly, createShop);
router.put("/:id", protect, ownerOnly, updateShop);
router.get("/", getShops);
 
module.exports = router;