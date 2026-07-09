const express = require("express");
const router = express.Router();

const {
  upsertInventory,
  getInventory,
  getAvailableInventoryByShop,
  carryForwardInventory,
  deleteInventory,
} = require("../controllers/inventoryController");

const { protect, ownerOnly } = require("../middleware/authMiddleware");

router.post("/", protect, ownerOnly, upsertInventory);

router.get("/shop/:shopId", protect, ownerOnly, getInventory);

router.get("/available/shop/:shopId", getAvailableInventoryByShop);
router.post(
  "/carry-forward/:shopId",
  protect,
  ownerOnly,
  carryForwardInventory
);
router.delete("/:inventoryId", protect, ownerOnly, deleteInventory);

module.exports = router;