const express = require("express");
const router = express.Router();

const {
  getOwnerDashboardSummary,
  getLiveOrders,
  getInventorySummary,
  getBestSellingItems,
  getRevenueAnalytics,
  getLowStockAlerts,
  getSalesTrend,
} = require("../controllers/dashboardController");

const { protect, ownerOnly } = require("../middleware/authMiddleware");

router.get("/owner/:shopId", protect, ownerOnly, getOwnerDashboardSummary);
router.get("/owner/:shopId/live-orders", protect, ownerOnly, getLiveOrders);
router.get("/owner/:shopId/inventory", protect, ownerOnly, getInventorySummary);
router.get("/owner/:shopId/best-selling", protect, ownerOnly, getBestSellingItems);
router.get(
  "/owner/:shopId/revenue",
  protect,
  ownerOnly,
  getRevenueAnalytics
);
router.get(
  "/owner/:shopId/low-stock",
  protect,
  ownerOnly,
  getLowStockAlerts
);

router.get(
  "/owner/:shopId/sales-trend",
  protect,
  ownerOnly,
  getSalesTrend
);

module.exports = router;