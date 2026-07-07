const Order = require("../models/Order");
const Inventory = require("../models/Inventory");
const analyticsService = require("../services/analyticsService");
const { getLocalDate } = require("../helpers/dateHelper");

exports.getBusinessInsights = async (req, res) => {
  try {
    const { shopId } = req.params;

    const insights = [];

    // Today's Orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await Order.find({
      shop: shopId,
      createdAt: { $gte: today },
      orderStatus: { $nin: ["cancelled", "rejected", "expired"] },
    }).lean();

    const revenue = orders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );

    insights.push({
      type: "success",
      title: "Today's Revenue",
      message: `Today's revenue is ₹${revenue}.`,
    });

    // Inventory Check
    const inventory = await Inventory.find({
      shop: shopId,
      date: getLocalDate(),
    }).populate("item", "name")
    .lean();

    inventory.forEach((item) => {
      if (item.remainingQuantity <= 5) {
        insights.push({
          type: "warning",
          title: "Low Stock",
          message: `${item.item.name} has only ${item.remainingQuantity} remaining.`,
        });
      }
    });

    // Best Seller
    if (orders.length > 0) {
      const sales = {};

      orders.forEach((order) => {
        order.items.forEach((item) => {
          sales[item.name] =
            (sales[item.name] || 0) + item.quantity;
        });
      });

      const bestSeller = Object.keys(sales).reduce((a, b) =>
        sales[a] > sales[b] ? a : b
      );

      insights.push({
        type: "info",
        title: "Best Seller",
        message: `${bestSeller} is today's best-selling item.`,
      });
    }

    res.status(200).json({
      success: true,
      count: insights.length,
      insights,
    });

  } catch (error) {
    console.error("BUSINESS INSIGHTS ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getSmartInventorySuggestions = async (req, res) => {
  try {
    const { shopId } = req.params;

    const inventory = await Inventory.find({
        shop: shopId,
        })
        .sort({ updatedAt: -1 })
        .populate("item", "name price")
        .lean();

    const suggestions = inventory.map((record) => {
      let suggestion = "Stock level looks fine.";
      let priority = "normal";

      if (record.remainingQuantity === 0) {
        suggestion = `Prepare more ${record.item.name}. It is sold out.`;
        priority = "high";
      } else if (record.remainingQuantity <= 5) {
        suggestion = `Prepare more ${record.item.name} soon. Only ${record.remainingQuantity} left.`;
        priority = "high";
      } else if (record.remainingQuantity <= 10) {
        suggestion = `${record.item.name} is running low. Keep backup stock ready.`;
        priority = "medium";
      }

      return {
        item: record.item.name,
        preparedQuantity: record.preparedQuantity,
        soldQuantity: record.soldQuantity,
        remainingQuantity: record.remainingQuantity,
        suggestion,
        priority,
      };
    });

    res.status(200).json({
      success: true,
      count: suggestions.length,
      suggestions,
    });
  } catch (error) {
    console.error("SMART INVENTORY SUGGESTIONS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.getDemandPrediction = async (req, res) => {
  try {
    const { shopId } = req.params;

    const orders = await Order.find({
      shop: shopId,
      orderStatus: { $nin: ["cancelled", "rejected", "expired"] },
    }).lean();

    const itemSales = {};
    let totalRevenue = 0;

    orders.forEach((order) => {
      totalRevenue += order.totalAmount;

      order.items.forEach((item) => {
        if (!itemSales[item.name]) {
          itemSales[item.name] = {
            item: item.name,
            totalSold: 0,
            totalRevenue: 0,
          };
        }

        itemSales[item.name].totalSold += item.quantity;
        itemSales[item.name].totalRevenue += item.subtotal;
      });
    });

    const recommendedPreparation = Object.values(itemSales).map((item) => {
      const averageSold = item.totalSold / Math.max(orders.length, 1);
      const suggestedQuantity = Math.ceil(averageSold * 1.25);

      return {
        item: item.item,
        averageSold: Number(averageSold.toFixed(2)),
        suggestedQuantity,
        reason: `Based on previous sales, prepare around ${suggestedQuantity} ${item.item}.`,
      };
    });

    const averageOrderValue =
      orders.length > 0 ? totalRevenue / orders.length : 0;

    res.status(200).json({
      success: true,
      prediction: {
        basedOnOrders: orders.length,
        expectedOrders: Math.max(orders.length, 1),
        expectedRevenue: Math.round(averageOrderValue * Math.max(orders.length, 1)),
        confidence: orders.length >= 10 ? 85 : 60,
        recommendedPreparation,
      },
    });
  } catch (error) {
    console.error("DEMAND PREDICTION ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getKitchenIntelligence = async (req, res) => {
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

    const activeOrders = await Order.find({
      shop: shopId,
      orderStatus: { $in: activeStatuses },
    });

    const totalActiveOrders = activeOrders.length;

    let load = "LOW";
    let estimatedDelay = "0 mins";
    let recommendation = "Kitchen is operating normally.";
    let confidence = 95;

    if (totalActiveOrders >= 10) {
      load = "HIGH";
      estimatedDelay = "15 mins";
      recommendation =
        "Kitchen is overloaded. Consider assigning another cook.";
      confidence = 90;
    } else if (totalActiveOrders >= 5) {
      load = "MEDIUM";
      estimatedDelay = "8 mins";
      recommendation =
        "Kitchen is getting busy. Monitor order preparation closely.";
      confidence = 92;
    }

    res.status(200).json({
      success: true,
      kitchen: {
        load,
        activeOrders: totalActiveOrders,
        estimatedDelay,
        recommendation,
        confidence,
      },
    });

  } catch (error) {
    console.error("KITCHEN INTELLIGENCE ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getDailyActionPlan = async (req, res) => {
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

    const activeOrders = await Order.find({
      shop: shopId,
      orderStatus: { $in: activeStatuses },
    });

    const todayRevenueData = await analyticsService.getTodayRevenue(shopId);
    const todayRevenue = todayRevenueData.revenue;

    const allValidOrders = await Order.find({
      shop: shopId,
      orderStatus: { $nin: ["cancelled", "rejected", "expired"] },
    });

    const inventory = await Inventory.find({
      shop: shopId,
    }).populate("item", "name")
    .lean();

    const lowStockItems = inventory.filter(
      (item) => item.remainingQuantity <= 5
    );

    const sales = {};

    allValidOrders.forEach((order) => {
      order.items.forEach((item) => {
        sales[item.name] = (sales[item.name] || 0) + item.quantity;
      });
    });

    let bestSeller = "No sales";

    if (Object.keys(sales).length > 0) {
      bestSeller = Object.keys(sales).reduce((a, b) =>
        sales[a] > sales[b] ? a : b
      );
    }

    let kitchenLoad = "LOW";

    if (activeOrders.length >= 10) {
      kitchenLoad = "HIGH";
    } else if (activeOrders.length >= 5) {
      kitchenLoad = "MEDIUM";
    }

    const recommendations = [];

    lowStockItems.forEach((item) => {
      recommendations.push(
        `Prepare more ${item.item.name}. Only ${item.remainingQuantity} remaining.`
      );
    });

    if (activeOrders.length >= 5) {
      recommendations.push(
        "Kitchen is getting busy. Monitor preparation speed."
      );
    }

    if (bestSeller !== "No sales") {
      recommendations.push(
        `${bestSeller} is selling well. Prepare extra stock if possible.`
      );
    }

    res.status(200).json({
      success: true,
      actionPlan: {
        revenue: todayRevenue,
        activeOrders: activeOrders.length,
        kitchenLoad,
        bestSeller,
        lowStockItems: lowStockItems.map((i) => ({
          item: i.item.name,
          remaining: i.remainingQuantity,
        })),
        recommendations,
      },
    });
  } catch (error) {
    console.error("DAILY ACTION PLAN ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};