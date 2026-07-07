const mongoose = require("mongoose");
const Order = require("../models/Order");
const Inventory = require("../models/Inventory");
exports.getPeakHoursAnalytics = async (req, res) => {
  try {
    const { shopId } = req.params;

    const result = await Order.aggregate([
      {
        $match: {
          shop: new mongoose.Types.ObjectId(shopId),
          orderStatus: {
            $nin: ["cancelled", "rejected", "expired"],
          },
        },
      },
      {
        $group: {
          _id: {
            hour: {
              $hour: "$createdAt",
            },
          },
          totalOrders: {
            $sum: 1,
          },
          totalRevenue: {
            $sum: "$totalAmount",
          },
        },
      },
      {
        $sort: {
          "_id.hour": 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      peakHours: result,
    });

  } catch (error) {
    console.error("PEAK HOURS ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getTopCustomers = async (req, res) => {
  try {
    const { shopId } = req.params;

    const topCustomers = await Order.aggregate([
      {
        $match: {
          shop: new mongoose.Types.ObjectId(shopId),
          orderStatus: {
            $nin: ["cancelled", "rejected", "expired"],
          },
        },
      },
      {
        $group: {
          _id: "$customer",
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: "$totalAmount" },
          averageOrderValue: { $avg: "$totalAmount" },
        },
      },
      {
        $sort: {
          totalSpent: -1,
        },
      },
      {
        $limit: 10,
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $unwind: "$customer",
      },
      {
        $project: {
          _id: 0,
          customerId: "$customer._id",
          name: "$customer.name",
          phone: "$customer.phone",
          email: "$customer.email",
          totalOrders: 1,
          totalSpent: 1,
          averageOrderValue: {
            $round: ["$averageOrderValue", 2],
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      count: topCustomers.length,
      topCustomers,
    });

  } catch (error) {
    console.error("TOP CUSTOMERS ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.getRevenueReport = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { period = "daily" } = req.query;

    let format;

    switch (period) {
      case "weekly":
        format = "%Y-%U";
        break;

      case "monthly":
        format = "%Y-%m";
        break;

      case "yearly":
        format = "%Y";
        break;

      default:
        format = "%Y-%m-%d";
    }

    const report = await Order.aggregate([
      {
        $match: {
          shop: new mongoose.Types.ObjectId(shopId),
          orderStatus: {
            $nin: ["cancelled", "rejected", "expired"],
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format,
              date: "$createdAt",
            },
          },
          totalRevenue: {
            $sum: "$totalAmount",
          },
          totalOrders: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      period,
      report,
    });

  } catch (error) {
    console.error("REVENUE REPORT ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.getItemPerformance = async (req, res) => {
  try {
    const { shopId } = req.params;

    const itemPerformance = await Order.aggregate([
      {
        $match: {
          shop: new mongoose.Types.ObjectId(shopId),
          orderStatus: { $nin: ["cancelled", "rejected", "expired"] },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.item",
          itemName: { $first: "$items.name" },
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.subtotal" },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);

    res.status(200).json({
      success: true,
      count: itemPerformance.length,
      itemPerformance,
    });
  } catch (error) {
    console.error("ITEM PERFORMANCE ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



exports.getWasteAnalysis = async (req, res) => {
  try {
    const { shopId } = req.params;

    const inventory = await Inventory.find({
      shop: shopId,
    }).populate("item", "name")
    .lean();

    const wasteAnalysis = inventory.map((record) => {
      const wastePercentage =
        record.preparedQuantity > 0
          ? Number(
              (
                (record.wastedQuantity / record.preparedQuantity) *
                100
              ).toFixed(2)
            )
          : 0;

      return {
        date: record.date,
        item: record.item?.name,
        preparedQuantity: record.preparedQuantity,
        soldQuantity: record.soldQuantity,
        remainingQuantity: record.remainingQuantity,
        wastedQuantity: record.wastedQuantity,
        wastePercentage,
      };
    });

    const totalPrepared = inventory.reduce(
      (sum, i) => sum + i.preparedQuantity,
      0
    );

    const totalSold = inventory.reduce(
      (sum, i) => sum + i.soldQuantity,
      0
    );

    const totalWaste = inventory.reduce(
      (sum, i) => sum + i.wastedQuantity,
      0
    );

    const overallWastePercentage =
      totalPrepared > 0
        ? Number(((totalWaste / totalPrepared) * 100).toFixed(2))
        : 0;

    res.status(200).json({
      success: true,
      summary: {
        totalPrepared,
        totalSold,
        totalWaste,
        overallWastePercentage,
      },
      wasteAnalysis,
    });

  } catch (error) {
    console.error("WASTE ANALYSIS ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};