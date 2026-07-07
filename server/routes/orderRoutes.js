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


const { protect, ownerOnly } = require("../middleware/authMiddleware");


router.post("/place", protect, placeOrder);
router.get("/my-orders", protect, getMyOrders);
router.get("/shop/:shopId", protect, ownerOnly, getShopOrders);
router.put("/status/:orderId", protect, ownerOnly, updateOrderStatus);

router.get("/kitchen-queue/:shopId", protect, ownerOnly, getKitchenQueue);

router.put("/cancel/:orderId", protect, cancelOrder);
router.get("/shop/:shopId/history", protect, ownerOnly, getShopOrderHistory);

module.exports = router;