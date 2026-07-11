const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Inventory = require("../models/Inventory");
const Shop = require("../models/Shop");
const { getLocalDate } = require("../helpers/dateHelper");

const TIME_ZONE = "Asia/Kolkata";
const DEFAULT_PREPARATION_MINUTES = 10;

const timeToMinutes = (time) => {
  if (!time || !time.includes(":")) {
    return 0;
  }

  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
};

const getIndiaDateAndMinutes = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);

  const getPart = (type) =>
    parts.find((part) => part.type === type)?.value || "";

  return {
    date: `${getPart("year")}-${getPart("month")}-${getPart("day")}`,
    minutes:
      Number(getPart("hour")) * 60 +
      Number(getPart("minute")),
  };
};

const getShopServiceSlots = (shop) => {
  const customSlots = Array.isArray(shop?.serviceSlots)
    ? shop.serviceSlots
        .filter((slot) => slot.isEnabled !== false)
        .sort((first, second) =>
          first.openingTime.localeCompare(second.openingTime)
        )
    : [];

  if (customSlots.length > 0) {
    return customSlots;
  }

  // Fallback for older shops
  if (shop?.openingTime && shop?.closingTime) {
    return [
      {
        name: "Shop Hours",
        openingTime: shop.openingTime,
        closingTime: shop.closingTime,
        isEnabled: true,
      },
    ];
  }

  return [];
};

exports.placeOrder = async (req, res) => {
  try {
    const {
      shop,
      arrivalTime,
      customerNote,
      notes,
      paymentMethod = "cash",
    } = req.body;

    if (!shop || !arrivalTime) {
      return res.status(400).json({
        success: false,
        message: "Shop and arrival time are required.",
      });
    }

    if (!["cash", "upi"].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method.",
      });
    }

    const arrivalDate = new Date(arrivalTime);

    if (Number.isNaN(arrivalDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid arrival time.",
      });
    }

    const [shopDocument, cart] = await Promise.all([
      Shop.findById(shop),

      Cart.findOne({
        customer: req.user._id,
        shop,
      }).populate(
        "items.item",
        "name price preparationTime prepTime preparationMinutes"
      ),
    ]);

    if (!shopDocument) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    if (shopDocument.isActive === false) {
      return res.status(400).json({
        success: false,
        message: "This shop is currently inactive.",
      });
    }

    const now = new Date();

    if (
      shopDocument.temporaryClosedUntil &&
      new Date(shopDocument.temporaryClosedUntil) > now
    ) {
      return res.status(400).json({
        success: false,
        message:
          shopDocument.temporaryCloseReason ||
          "This shop is temporarily closed.",
      });
    }

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty.",
      });
    }

    const maxPreparationTime = Math.max(
      DEFAULT_PREPARATION_MINUTES,
      ...cart.items.map((cartItem) => {
        const populatedItem =
          typeof cartItem.item === "object"
            ? cartItem.item
            : null;

        return Number(
          cartItem.preparationTime ||
            populatedItem?.preparationTime ||
            populatedItem?.prepTime ||
            populatedItem?.preparationMinutes ||
            DEFAULT_PREPARATION_MINUTES
        );
      })
    );

    const minimumArrivalTime = new Date(
      now.getTime() +
        maxPreparationTime * 60 * 1000
    );

    if (arrivalDate < minimumArrivalTime) {
      return res.status(400).json({
        success: false,
        message: `Arrival time must be at least ${maxPreparationTime} minutes from now.`,
      });
    }

    const currentIndiaTime =
      getIndiaDateAndMinutes(now);

    const arrivalIndiaTime =
      getIndiaDateAndMinutes(arrivalDate);

    // QuickPick currently supports only today's inventory.
    if (
      arrivalIndiaTime.date !== currentIndiaTime.date
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Orders can currently be scheduled only for today.",
      });
    }

    const serviceSlots =
      getShopServiceSlots(shopDocument);

    if (serviceSlots.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Shop service timings have not been configured.",
      });
    }

    const arrivalSlot = serviceSlots.find(
      (slot) => {
        const openingMinutes =
          timeToMinutes(slot.openingTime);

        const closingMinutes =
          timeToMinutes(slot.closingTime);

        return (
          arrivalIndiaTime.minutes >=
            openingMinutes &&
          arrivalIndiaTime.minutes <
            closingMinutes
        );
      }
    );

    if (!arrivalSlot) {
      return res.status(400).json({
        success: false,
        message:
          "Selected arrival time is outside the shop's service timings.",
      });
    }

    const currentSlot = serviceSlots.find(
      (slot) => {
        const openingMinutes =
          timeToMinutes(slot.openingTime);

        const closingMinutes =
          timeToMinutes(slot.closingTime);

        return (
          currentIndiaTime.minutes >=
            openingMinutes &&
          currentIndiaTime.minutes <
            closingMinutes
        );
      }
    );

    const arrivalIsInCurrentSession =
      currentSlot &&
      arrivalIndiaTime.minutes >=
        currentIndiaTime.minutes &&
      arrivalIndiaTime.minutes <
        timeToMinutes(currentSlot.closingTime);

    const isPreOrder =
      !arrivalIsInCurrentSession;

    if (
      isPreOrder &&
      shopDocument.acceptsPreOrders === false
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This shop is not accepting pre-orders.",
      });
    }

    const today = getLocalDate();

    // Validate today's inventory
    for (const cartItem of cart.items) {
      const itemId =
        cartItem.item?._id || cartItem.item;

      const itemName =
        cartItem.name ||
        cartItem.item?.name ||
        "Item";

      const inventory = await Inventory.findOne({
        shop,
        item: itemId,
        date: today,
      });

      if (
        !inventory ||
        inventory.remainingQuantity <
          cartItem.quantity
      ) {
        return res.status(400).json({
          success: false,
          message: `${itemName} is not available in the requested quantity.`,
        });
      }
    }

    // Deduct inventory
    for (const cartItem of cart.items) {
      const itemId =
        cartItem.item?._id || cartItem.item;

      await Inventory.findOneAndUpdate(
        {
          shop,
          item: itemId,
          date: today,
        },
        {
          $inc: {
            soldQuantity: cartItem.quantity,
            remainingQuantity:
              -cartItem.quantity,
          },
        }
      );
    }

    const kitchenStartTime = new Date(
      arrivalDate.getTime() -
        maxPreparationTime * 60 * 1000
    );

    const expectedReadyTime = new Date(
      arrivalDate.getTime() -
        2 * 60 * 1000
    );

    const orderItems = cart.items.map(
      (cartItem) => {
        const rawItem =
          typeof cartItem.toObject ===
          "function"
            ? cartItem.toObject()
            : { ...cartItem };

        return {
          ...rawItem,
          item:
            rawItem.item?._id ||
            rawItem.item,
        };
      }
    );

    const order = await Order.create({
      customer: req.user._id,
      shop,
      items: orderItems,
      totalAmount: cart.totalAmount,
      arrivalTime: arrivalDate,
      kitchenStartTime,
      expectedReadyTime,
      paymentMethod,
      paymentStatus: "pending",
      orderStatus: isPreOrder
        ? "scheduled"
        : "placed",
      customerNote:
        customerNote || notes || "",
    });

    cart.items = [];
    cart.totalAmount = 0;
    await cart.save();

    return res.status(201).json({
      success: true,
      message: isPreOrder
        ? "Pre-order scheduled successfully."
        : "Order placed successfully.",
      isPreOrder,
      serviceSession: arrivalSlot.name,
      order,
    });
  } catch (error) {
    console.error(
      "PLACE ORDER ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to place order.",
    });
  }
};


exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      customer: req.user._id,
    })
      .populate("shop", "name phone address city")
      .sort({ createdAt: -1 })
      .lean();

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
      .sort({ arrivalTime: 1 })
      .lean();

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
      .sort({ kitchenStartTime: 1, arrivalTime: 1 })
      .lean();

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
    const { reason } = req.body || {};

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
      .sort({ updatedAt: -1 })
      .lean();

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

