const express = require("express");
const router = express.Router();

const {
  getBusinessInsights,
  getSmartInventorySuggestions,
  getDemandPrediction,
  getKitchenIntelligence,
  getDailyActionPlan,
} = require("../controllers/aiController");

const { protect, ownerOnly } = require("../middleware/authMiddleware");

router.get(
  "/owner/:shopId/business-insights",
  protect,
  ownerOnly,
  getBusinessInsights
);


router.get(
  "/owner/:shopId/inventory-suggestions",
  protect,
  ownerOnly,
  getSmartInventorySuggestions
);

router.get(
  "/owner/:shopId/demand-prediction",
  protect,
  ownerOnly,
  getDemandPrediction
);
router.get(
  "/owner/:shopId/kitchen-intelligence",
  protect,
  ownerOnly,
  getKitchenIntelligence
);
router.get(
  "/owner/:shopId/daily-action-plan",
  protect,
  ownerOnly,
  getDailyActionPlan
);

module.exports = router;