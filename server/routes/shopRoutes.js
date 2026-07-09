const express = require("express");
const router = express.Router();

const {
  createShop,
  getShops,
  updateShop,
  temporaryCloseShop,
  reopenShop,
} = require("../controllers/shopController");
const { protect, ownerOnly } = require("../middleware/authMiddleware");

 
router.post("/", protect, ownerOnly, createShop);
router.put("/:id", protect, ownerOnly, updateShop);
router.get("/", getShops);
router.put("/:shopId/temporary-close", protect, ownerOnly, temporaryCloseShop);
router.put("/:shopId/reopen", protect, ownerOnly, reopenShop);


module.exports = router;