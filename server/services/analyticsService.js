const Order = require("../models/Order");

exports.getTodayRevenue = async (shopId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const orders = await Order.find({
    shop: shopId,
    createdAt: {
      $gte: today,
      $lt: tomorrow,
    },
    orderStatus: {
      $nin: ["cancelled", "rejected", "expired"],
    },
  });

  const revenue = orders.reduce(
    (sum, order) => sum + order.totalAmount,
    0
  );

  return {
    revenue,
    totalOrders: orders.length,
    
  };
};