const express = require("express");
const router = express.Router();

const { protect, ownerOnly } = require("../middleware/authMiddleware");
const {
  upsertInventory,
  getInventory,
  deleteInventory,
} = require("../controllers/inventoryController");

router.post("/", protect, ownerOnly, upsertInventory);

router.get(
  "/shop/:shopId",
  protect,
  ownerOnly,
  getInventory
);
router.delete("/:inventoryId", protect, ownerOnly, deleteInventory);
module.exports = router;