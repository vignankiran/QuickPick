const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Inventory = require("../models/Inventory");

exports.placeOrder = async (req, res) => {
  try {
    const { shop, arrivalTime, customerNote } = req.body;

    if (!shop || !arrivalTime) {
      return res.status(400).json({
        success: false,
        message: "Shop and arrival time are required.",
      });
    }

    const cart = await Cart.findOne({
      customer: req.user._id,
      shop,
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty.",
      });
    }

    // Basic inventory validation
    const today = new Date().toISOString().split("T")[0];

    for (const cartItem of cart.items) {
      const inventory = await Inventory.findOne({
        shop,
        item: cartItem.item,
        date: today,
      });

      if (!inventory || inventory.remainingQuantity < cartItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `${cartItem.name} is not available in requested quantity.`,
        });
      }
    }

    // Deduct inventory
    for (const cartItem of cart.items) {
      await Inventory.findOneAndUpdate(
        {
          shop,
          item: cartItem.item,
          date: today,
        },
        {
          $inc: {
            soldQuantity: cartItem.quantity,
            remainingQuantity: -cartItem.quantity,
          },
        }
      );
    }

    const maxPreparationTime = Math.max(
      ...cart.items.map((item) => item.quantity * 0 + 10)
    );

    const arrivalDate = new Date(arrivalTime);
    const kitchenStartTime = new Date(
      arrivalDate.getTime() - maxPreparationTime * 60 * 1000
    );

    const expectedReadyTime = new Date(
      arrivalDate.getTime() - 2 * 60 * 1000
    );

    const order = await Order.create({
      customer: req.user._id,
      shop,
      items: cart.items,
      totalAmount: cart.totalAmount,
      arrivalTime: arrivalDate,
      kitchenStartTime,
      expectedReadyTime,
      paymentMethod: "cash",
      paymentStatus: "pending",
      orderStatus: "placed",
      customerNote,
    });

    cart.items = [];
    cart.totalAmount = 0;
    await cart.save();

    res.status(201).json({
      success: true,
      message: "Order placed successfully.",
      order,
    });
  } catch (error) {
    console.error("PLACE ORDER ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      customer: req.user._id,
    })
      .populate("shop", "name phone address city")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("GET MY ORDERS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.getShopOrders = async (req, res) => {
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
      .populate("customer", "name phone email")
      .sort({ arrivalTime: 1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("GET SHOP ORDERS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { orderStatus, ownerNote } = req.body;

    const allowedStatuses = [
      "placed",
      "confirmed",
      "scheduled",
      "preparing",
      "ready",
      "customer_arrived",
      "handed_over",
      "completed",
      "cancelled",
      "rejected",
      "expired",
    ];

    if (!allowedStatuses.includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status.",
      });
    }

    const order = await Order.findById(orderId).populate("shop");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (order.shop.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Owner only.",
      });
    }

    order.orderStatus = orderStatus;

    if (ownerNote) {
      order.ownerNote = ownerNote;
    }

    order.statusHistory.push({
      status: orderStatus,
      at: new Date(),
      note: ownerNote || "",
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: "Order status updated successfully.",
      order,
    });

  } catch (error) {
    console.error("UPDATE ORDER STATUS ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getKitchenQueue = async (req, res) => {
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
      .sort({ kitchenStartTime: 1, arrivalTime: 1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      queue: orders,
    });
  } catch (error) {
    console.error("GET KITCHEN QUEUE ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (order.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can cancel only your own order.",
      });
    }

    const cancellableStatuses = ["placed", "confirmed", "scheduled"];

    if (!cancellableStatuses.includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "Order cannot be cancelled after preparation starts.",
      });
    }

    order.orderStatus = "cancelled";

    order.statusHistory.push({
      status: "cancelled",
      at: new Date(),
      note: reason || "Cancelled by customer",
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully.",
      order,
    });
  } catch (error) {
    console.error("CANCEL ORDER ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.getShopOrderHistory = async (req, res) => {
  try {
    const { shopId } = req.params;

    const historyStatuses = [
      "completed",
      "cancelled",
      "rejected",
      "expired",
    ];

    const orders = await Order.find({
      shop: shopId,
      orderStatus: { $in: historyStatuses },
    })
      .populate("customer", "name phone email")
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("GET SHOP ORDER HISTORY ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

