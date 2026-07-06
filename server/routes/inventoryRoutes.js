const express = require("express");
const router = express.Router();

const { upsertInventory } = require("../controllers/inventoryController");
const { protect, ownerOnly } = require("../middleware/authMiddleware");

router.post("/", protect, ownerOnly, upsertInventory);

module.exports = router;