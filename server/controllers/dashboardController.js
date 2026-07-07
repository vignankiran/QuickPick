const Order = require("../models/Order");
const Inventory = require("../models/Inventory");
const mongoose = require("mongoose");
const { getLocalDate } = require("../helpers/dateHelper");



exports.getOwnerDashboardSummary = async (req, res) => {
  try {
    const { shopId } = req.params;

    const today = getLocalDate();


    const startOfDay = new Date(`${today}T00:00:00.000Z`);
    const endOfDay = new Date(`${today}T23:59:59.999Z`);

    const todayOrders = await Order.find({
      shop: shopId,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    }).lean();

    const totalOrders = todayOrders.length;

    const todayRevenue = todayOrders
      .filter((order) => order.orderStatus !== "cancelled")
      .reduce((total, order) => total + order.totalAmount, 0);

    const statusCounts = {
      placed: 0,
      confirmed: 0,
      scheduled: 0,
      preparing: 0,
      ready: 0,
      customer_arrived: 0,
      handed_over: 0,
      completed: 0,
      cancelled: 0,
      rejected: 0,
      expired: 0,
    };

    todayOrders.forEach((order) => {
      statusCounts[order.orderStatus] =
        (statusCounts[order.orderStatus] || 0) + 1;
    });

    const inventory = await Inventory.find({
      shop: shopId,
      date: today,
    }).populate("item", "name price")
    .lean();

    const lowStockItems = inventory.filter(
      (inv) => inv.remainingQuantity > 0 && inv.remainingQuantity <= 10
    );

    const soldOutItems = inventory.filter(
      (inv) => inv.remainingQuantity === 0
    );

    res.status(200).json({
      success: true,
      summary: {
        totalOrders,
        todayRevenue,
        statusCounts,
        lowStockCount: lowStockItems.length,
        soldOutCount: soldOutItems.length,
        lowStockItems,
        soldOutItems,
      },
    });
  } catch (error) {
    console.error("OWNER DASHBOARD ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getLiveOrders = async (req, res) => {
  try {
    const { shopId } = req.params;

    const activeStatuses = [
      "placed",
      "confirmed",
      "scheduled",
      "preparing",
      "ready",
      "customer_arrived",
    ];

    const orders = await Order.find({
      shop: shopId,
      orderStatus: { $in: activeStatuses },
    })
      .populate("customer", "name phone")
      .sort({ arrivalTime: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("LIVE ORDERS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getInventorySummary = async (req, res) => {
  try {
    const { shopId } = req.params;
    const today = getLocalDate();
    const inventory = await Inventory.find({
      shop: shopId,
      date: today,
    }).populate("item", "name price")
    .lean();

    res.status(200).json({
      success: true,
      count: inventory.length,
      inventory,
    });
  } catch (error) {
    console.error("INVENTORY SUMMARY ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getBestSellingItems = async (req, res) => {
  try {
    const { shopId } = req.params;

    const result = await Order.aggregate([
      {
        $match: {
        shop: new mongoose.Types.ObjectId(shopId),
          orderStatus: { $ne: "cancelled" },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.name",
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.subtotal" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]);

    res.status(200).json({
      success: true,
      bestSellingItems: result,
    });
  } catch (error) {
    console.error("BEST SELLING ITEMS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getRevenueAnalytics = async (req, res) => {
  try {
    const { shopId } = req.params;

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

    const totalRevenue = orders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );

    const totalOrders = orders.length;

    const averageOrderValue =
      totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const completedOrders = orders.filter(
      (o) => o.orderStatus === "completed"
    ).length;

    res.status(200).json({
      success: true,
      analytics: {
        totalRevenue,
        totalOrders,
        averageOrderValue: Number(averageOrderValue.toFixed(2)),
        completedOrders,
      },
    });
  } catch (error) {
    console.error("REVENUE ANALYTICS ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.getLowStockAlerts = async (req, res) => {
  try {
    const { shopId } = req.params;

    const today = getLocalDate();


    const inventory = await Inventory.find({
      shop: shopId,
      date: today,
    }).populate("item", "name price")
    .lean();

    const LOW_STOCK_THRESHOLD = 10;

    const lowStockItems = inventory.filter(
      (item) =>
        item.remainingQuantity > 0 &&
        item.remainingQuantity <= LOW_STOCK_THRESHOLD
    );

    const soldOutItems = inventory.filter(
      (item) => item.remainingQuantity === 0
    );

    res.status(200).json({
      success: true,
      threshold: LOW_STOCK_THRESHOLD,
      lowStockCount: lowStockItems.length,
      soldOutCount: soldOutItems.length,
      lowStockItems,
      soldOutItems,
    });
  } catch (error) {
    console.error("LOW STOCK ALERT ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getSalesTrend = async (req, res) => {
  try {
    const { shopId } = req.params;

    const days = 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const salesTrend = await Order.aggregate([
      {
        $match: {
          shop: new mongoose.Types.ObjectId(shopId),
          createdAt: { $gte: startDate },
          orderStatus: { $nin: ["cancelled", "rejected", "expired"] },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          totalRevenue: { $sum: "$totalAmount" },
          totalOrders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      days,
      salesTrend,
    });
  } catch (error) {
    console.error("SALES TREND ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};