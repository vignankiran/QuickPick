const express = require("express");
const router = express.Router();

const {
  getPeakHoursAnalytics,
  getTopCustomers,
  getRevenueReport,
  getItemPerformance,
  getWasteAnalysis,
} = require("../controllers/analyticsController");

const {
  protect,
  ownerOnly,
} = require("../middleware/authMiddleware");

router.get(
  "/owner/:shopId/peak-hours",
  protect,
  ownerOnly,
  getPeakHoursAnalytics
);

router.get(
  "/owner/:shopId/top-customers",
  protect,
  ownerOnly,
  getTopCustomers
);
router.get(
  "/owner/:shopId/revenue-report",
  protect,
  ownerOnly,
  getRevenueReport
);

router.get(
  "/owner/:shopId/item-performance",
  protect,
  ownerOnly,
  getItemPerformance
);

router.get(
  "/owner/:shopId/waste-analysis",
  protect,
  ownerOnly,
  getWasteAnalysis
);

module.exports = router;