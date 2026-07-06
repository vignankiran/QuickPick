const express = require("express");
const router = express.Router();

const {
  placeOrder,
  getMyOrders,
  getShopOrders,
  updateOrderStatus,
  getKitchenQueue,
  cancelOrder,
  getShopOrderHistory,
} = require("../controllers/orderController");


const { protect } = require("../middleware/authMiddleware");

router.post("/place", protect, placeOrder);
router.get("/my-orders", protect, getMyOrders);
router.get("/shop/:shopId", protect, getShopOrders);
router.put("/status/:orderId", protect, updateOrderStatus);
router.get("/kitchen-queue/:shopId", protect, getKitchenQueue);
router.put("/cancel/:orderId", protect, cancelOrder);
router.get("/shop/:shopId/history", protect, getShopOrderHistory);

module.exports = router;