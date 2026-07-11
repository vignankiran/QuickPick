const mongoose = require("mongoose");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Inventory = require("../models/Inventory");
const Shop = require("../models/Shop");
const Item = require("../models/Item");
const PickupSlot = require("../models/PickupSlot");
const { getLocalDate } = require("../helpers/dateHelper");


const TIME_ZONE = "Asia/Kolkata";
const DEFAULT_PREPARATION_MINUTES = 10;
const createOrderError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};
const allowedStatusTransitions = {
  placed: [
    "confirmed",
    "cancelled",
    "rejected",
    "expired",
  ],

  scheduled: [
    "confirmed",
    "cancelled",
    "rejected",
    "expired",
  ],

  confirmed: [
    "preparing",
    "cancelled",
    "rejected",
    "expired",
  ],

  preparing: ["ready"],

  ready: [
    "customer_arrived",
    "handed_over",
  ],

  customer_arrived: ["handed_over"],

  handed_over: ["completed"],

  completed: [],
  cancelled: [],
  rejected: [],
  expired: [],
};
const reservePickupSlot = async ({
  shopId,
  arrivalDate,
  slotDate,
  serviceSession,
  capacity,
  session,
}) => {
  try {
    const pickupSlot = await PickupSlot.findOneAndUpdate(
      {
        shop: shopId,
        arrivalTime: arrivalDate,

        // Increment only when space is still available.
        bookedOrders: {
          $lt: capacity,
        },
      },
      {
        $setOnInsert: {
          slotDate,
        },

        $set: {
          serviceSession,
          capacity,
        },

        $inc: {
          bookedOrders: 1,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        session,
      }
    );

    if (!pickupSlot) {
      throw createOrderError(
        400,
        "This pickup time is full. Please select another time."
      );
    }

    return pickupSlot;
  } catch (error) {
    /*
     * When the slot already exists but has reached capacity,
     * the upsert may produce a duplicate-key error because of
     * the unique shop + arrivalTime index.
     */
    if (error?.code === 11000) {
      throw createOrderError(
        400,
        "This pickup time is full. Please select another time."
      );
    }

    throw error;
  }
};
const releasePickupSlotForOrder = async (
  order,
  session = null
) => {
  if (order.pickupSlotReleased) {
    return {
      released: false,
      reason: "already_released",
    };
  }

  const shopId =
    order.shop?._id || order.shop;

  const arrivalDate = new Date(
    order.arrivalTime
  );

  if (
    !shopId ||
    Number.isNaN(arrivalDate.getTime())
  ) {
    throw createOrderError(
      500,
      "Invalid shop or arrival time while releasing pickup slot."
    );
  }

  /*
   * Match the complete pickup minute.
   * This prevents seconds or milliseconds from causing a mismatch.
   */
  const minuteStart = new Date(arrivalDate);
  minuteStart.setSeconds(0, 0);

  const minuteEnd = new Date(
    minuteStart.getTime() + 60 * 1000
  );

  const updatedPickupSlot =
    await PickupSlot.findOneAndUpdate(
      {
        shop: shopId,

        arrivalTime: {
          $gte: minuteStart,
          $lt: minuteEnd,
        },

        bookedOrders: {
          $gt: 0,
        },
      },
      {
        $inc: {
          bookedOrders: -1,
        },
      },
      {
        returnDocument: "after",
        session,
      }
    );

  if (!updatedPickupSlot) {
    throw createOrderError(
      500,
      "Reserved pickup slot could not be found or was already empty."
    );
  }

  return {
    released: true,
    pickupSlot: updatedPickupSlot,
  };
};
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
const getOrderInventoryDate = (order) => {
  const sourceDate =
    order.arrivalTime ||
    order.createdAt ||
    new Date();

  return getIndiaDateAndMinutes(
    new Date(sourceDate)
  ).date;
};

const restoreInventoryForOrder = async (
  order,
  session = null
) => {
const inventoryDate =
    getOrderInventoryDate(order);

  const shopId =
    order.shop?._id || order.shop;

  for (const orderItem of order.items || []) {
    const itemId =
      orderItem.item?._id ||
      orderItem.item;

    const quantity = Number(
      orderItem.quantity || 0
    );

    if (!itemId || quantity <= 0) {
      continue;
    }

    const updatedInventory =
      await Inventory.findOneAndUpdate(
        {
          shop: shopId,
          item: itemId,
          date: inventoryDate,

          // Prevent sold quantity from becoming negative.
          soldQuantity: {
            $gte: quantity,
          },
        },
        {
          $inc: {
            soldQuantity: -quantity,
            remainingQuantity: quantity,
          },
        },
        {
          returnDocument: "after",
          session,
        }
      );

    if (!updatedInventory) {
      const itemName =
        orderItem.name ||
        orderItem.item?.name ||
        "item";

      throw new Error(
        `Could not restore inventory for ${itemName}.`
      );
    }

    // A previously sold-out item should become visible again.
    if (
      updatedInventory.remainingQuantity > 0 &&
      updatedInventory.status === "sold_out"
    ) {
      updatedInventory.status = "available";
      await updatedInventory.save({ session });
    }
  }
};

exports.placeOrder = async (req, res) => {
  const session = await mongoose.startSession();

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

    let createdOrder = null;
    let orderIsPreOrder = false;
    let selectedSessionName = "";

    await session.withTransaction(async () => {
      const shopDocument = await Shop.findById(shop).session(session);

      if (!shopDocument) {
        throw createOrderError(404, "Shop not found.");
      }

      if (shopDocument.isActive === false) {
        throw createOrderError(
          400,
          "This shop is currently inactive."
        );
      }

      const now = new Date();

      if (
        shopDocument.temporaryClosedUntil &&
        new Date(shopDocument.temporaryClosedUntil) > now
      ) {
        throw createOrderError(
          400,
          shopDocument.temporaryCloseReason ||
            "This shop is temporarily closed."
        );
      }

      const cart = await Cart.findOne({
        customer: req.user._id,
        shop,
      }).session(session);

      if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
        throw createOrderError(400, "Cart is empty.");
      }

      const itemIds = cart.items.map(
        (cartItem) => cartItem.item?._id || cartItem.item
      );

      const databaseItems = await Item.find({
        _id: { $in: itemIds },
        shop,
        isAvailable: { $ne: false },
      })
        .session(session)
        .lean();

      const itemMap = new Map(
        databaseItems.map((item) => [
          item._id.toString(),
          item,
        ])
      );

      if (databaseItems.length !== itemIds.length) {
        throw createOrderError(
          400,
          "One or more cart items are no longer available."
        );
      }

      const secureOrderItems = cart.items.map((cartItem) => {
        const itemId = (
          cartItem.item?._id || cartItem.item
        ).toString();

        const databaseItem = itemMap.get(itemId);
        const quantity = Number(cartItem.quantity || 0);

        if (!databaseItem) {
          throw createOrderError(
            400,
            "One or more cart items were not found."
          );
        }

        if (!Number.isInteger(quantity) || quantity < 1) {
          throw createOrderError(
            400,
            `Invalid quantity for ${databaseItem.name}.`
          );
        }

        const price = Number(databaseItem.price || 0);

        if (!Number.isFinite(price) || price < 0) {
          throw createOrderError(
            400,
            `Invalid price configured for ${databaseItem.name}.`
          );
        }

        return {
          item: databaseItem._id,
          name: databaseItem.name,
          price,
          quantity,
          subtotal: price * quantity,
        };
      });

      const secureTotalAmount = secureOrderItems.reduce(
        (total, orderItem) => total + orderItem.subtotal,
        0
      );

      const maxPreparationTime = Math.max(
        DEFAULT_PREPARATION_MINUTES,
        ...databaseItems.map((item) =>
          Number(
            item.preparationTime ||
              item.prepTime ||
              item.preparationMinutes ||
              DEFAULT_PREPARATION_MINUTES
          )
        )
      );

      const minimumArrivalTime = new Date(
        now.getTime() + maxPreparationTime * 60 * 1000
      );

      if (arrivalDate < minimumArrivalTime) {
        throw createOrderError(
          400,
          `Arrival time must be at least ${maxPreparationTime} minutes from now.`
        );
      }

      const currentIndiaTime = getIndiaDateAndMinutes(now);
      const arrivalIndiaTime =
        getIndiaDateAndMinutes(arrivalDate);

      if (arrivalIndiaTime.date !== currentIndiaTime.date) {
        throw createOrderError(
          400,
          "Orders can currently be scheduled only for today."
        );
      }

      const serviceSlots = getShopServiceSlots(shopDocument);

      if (serviceSlots.length === 0) {
        throw createOrderError(
          400,
          "Shop service timings have not been configured."
        );
      }

      const arrivalSlot = serviceSlots.find((slot) => {
        const openingMinutes = timeToMinutes(slot.openingTime);
        const closingMinutes = timeToMinutes(slot.closingTime);

        return (
          arrivalIndiaTime.minutes >= openingMinutes &&
          arrivalIndiaTime.minutes < closingMinutes
        );
      });

      if (!arrivalSlot) {
        throw createOrderError(
          400,
          "Selected arrival time is outside the shop's service timings."
        );
      }

      const currentSlot = serviceSlots.find((slot) => {
        const openingMinutes = timeToMinutes(slot.openingTime);
        const closingMinutes = timeToMinutes(slot.closingTime);

        return (
          currentIndiaTime.minutes >= openingMinutes &&
          currentIndiaTime.minutes < closingMinutes
        );
      });

      const arrivalIsInCurrentSession =
        currentSlot &&
        arrivalIndiaTime.minutes >= currentIndiaTime.minutes &&
        arrivalIndiaTime.minutes <
          timeToMinutes(currentSlot.closingTime);

      orderIsPreOrder = !arrivalIsInCurrentSession;
      selectedSessionName = arrivalSlot.name;

      if (
        orderIsPreOrder &&
        shopDocument.acceptsPreOrders === false
      ) {
        throw createOrderError(
          400,
          "This shop is not accepting pre-orders."
        );
      }
      const slotCapacity = Number(
  shopDocument.maxOrdersPerSlot || 10
);

if (
  !Number.isInteger(slotCapacity) ||
  slotCapacity < 1
) {
  throw createOrderError(
    400,
    "The shop pickup-slot capacity is not configured correctly."
  );
}

await reservePickupSlot({
  shopId: shopDocument._id,
  arrivalDate,
  slotDate: arrivalIndiaTime.date,
  serviceSession: arrivalSlot.name,
  capacity: slotCapacity,
  session,
});
      const inventoryDate = getLocalDate();

      /*
       * Atomic stock deduction.
       * The update succeeds only when enough stock still exists.
       */
      for (const orderItem of secureOrderItems) {
        const updatedInventory =
          await Inventory.findOneAndUpdate(
            {
              shop,
              item: orderItem.item,
              date: inventoryDate,
              remainingQuantity: {
                $gte: orderItem.quantity,
              },
            },
            {
              $inc: {
                soldQuantity: orderItem.quantity,
                remainingQuantity: -orderItem.quantity,
              },
            },
            {
              returnDocument: "after",
              session,
            }
          );

        if (!updatedInventory) {
          throw createOrderError(
            400,
            `${orderItem.name} is no longer available in the requested quantity.`
          );
        }

        const newInventoryStatus =
          updatedInventory.remainingQuantity === 0
            ? "sold_out"
            : "available";

        if (updatedInventory.status !== newInventoryStatus) {
          updatedInventory.status = newInventoryStatus;
          await updatedInventory.save({ session });
        }
      }

      const kitchenStartTime = new Date(
        arrivalDate.getTime() -
          maxPreparationTime * 60 * 1000
      );

      const expectedReadyTime = new Date(
        arrivalDate.getTime() - 2 * 60 * 1000
      );

      const createdOrders = await Order.create(
        [
          {
            customer: req.user._id,
            shop,
            items: secureOrderItems,
            totalAmount: secureTotalAmount,
            arrivalTime: arrivalDate,
            kitchenStartTime,
            expectedReadyTime,
            paymentMethod,
            paymentStatus: "pending",
            orderStatus: orderIsPreOrder
              ? "scheduled"
              : "placed",
            customerNote: customerNote || notes || "",
          },
        ],
        {
          session,
        }
      );

      createdOrder = createdOrders[0];

      await Cart.updateOne(
        {
          _id: cart._id,
          customer: req.user._id,
          shop,
        },
        {
          $set: {
            items: [],
            totalAmount: 0,
          },
        },
        {
          session,
        }
      );
    });

    return res.status(201).json({
      success: true,
      message: orderIsPreOrder
        ? "Pre-order scheduled successfully."
        : "Order placed successfully.",
      isPreOrder: orderIsPreOrder,
      serviceSession: selectedSessionName,
      order: createdOrder,
    });
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) {
        console.warn(`PLACE ORDER REJECTED: ${error.message}`);
      } else {
        console.error("PLACE ORDER ERROR:", error);
      }

    const transactionsUnsupported =
      error.message?.includes(
        "Transaction numbers are only allowed on a replica set"
      );

    return res.status(error.statusCode || 500).json({
      success: false,
      message: transactionsUnsupported
        ? "Database transactions are unavailable. Use MongoDB Atlas or configure MongoDB as a replica set."
        : error.statusCode
        ? error.message
        : "Failed to place order. Please try again.",
    });
  } finally {
    await session.endSession();
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
  const session = await mongoose.startSession();

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

    let updatedOrder = null;
    let inventoryWasRestored = false;
    let pickupSlotWasReleased = false;

    await session.withTransaction(async () => {
      const order = await Order.findById(orderId)
        .session(session)
        .populate("shop");

      if (!order) {
        throw createOrderError(404, "Order not found.");
      }

      if (
        order.shop.owner.toString() !==
        req.user._id.toString()
      ) {
        throw createOrderError(
          403,
          "Access denied. Owner only."
        );
      }

      const previousStatus = order.orderStatus;

      if (previousStatus === orderStatus) {
        updatedOrder = order;
        return;
      }
      const validNextStatuses =
  allowedStatusTransitions[previousStatus] || [];

if (!validNextStatuses.includes(orderStatus)) {
  throw createOrderError(
    400,
    `Order status cannot change from ${previousStatus.replaceAll(
      "_",
      " "
    )} to ${orderStatus.replaceAll("_", " ")}.`
  );
}

      const cancellationStatuses = [
        "cancelled",
        "rejected",
        "expired",
      ];

      const beforePreparationStatuses = [
        "placed",
        "confirmed",
        "scheduled",
      ];

      const shouldReleaseOrderResources =
        cancellationStatuses.includes(orderStatus);

      if (
        shouldReleaseOrderResources &&
        !beforePreparationStatuses.includes(previousStatus)
      ) {
        throw createOrderError(
          400,
          "This order cannot be cancelled, rejected, or expired after preparation starts."
        );
      }

      if (
        shouldReleaseOrderResources &&
        !order.inventoryRestored
      ) {
        await restoreInventoryForOrder(order, session);

        order.inventoryRestored = true;
        order.inventoryRestoredAt = new Date();
        inventoryWasRestored = true;
      }

      if (
        shouldReleaseOrderResources &&
        !order.pickupSlotReleased
      ) {
        const releaseResult =
          await releasePickupSlotForOrder(order, session);

        if (releaseResult.released) {
          order.pickupSlotReleased = true;
          order.pickupSlotReleasedAt = new Date();
          pickupSlotWasReleased = true;
        }
      }

      order.orderStatus = orderStatus;

      if (ownerNote !== undefined) {
        order.ownerNote = String(ownerNote).trim();
      }

      order.statusHistory.push({
        status: orderStatus,
        at: new Date(),
        note:
          ownerNote ||
          `Status changed from ${previousStatus} to ${orderStatus}`,
      });

      await order.save({ session });

      updatedOrder = order;
    });

    return res.status(200).json({
      success: true,
      message:
        inventoryWasRestored || pickupSlotWasReleased
          ? "Order status updated, inventory restored, and pickup slot released."
          : "Order status updated successfully.",
      inventoryRestored:
        updatedOrder?.inventoryRestored || false,
      pickupSlotReleased:
        updatedOrder?.pickupSlotReleased || false,
      order: updatedOrder,
    });
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) {
      console.warn(
        `UPDATE ORDER STATUS REJECTED: ${error.message}`
      );
    } else {
      console.error("UPDATE ORDER STATUS ERROR:", error);
    }

    return res
      .status(error.statusCode || 500)
      .json({
        success: false,
        message: error.statusCode
          ? error.message
          : "Failed to update order status.",
      });
  } finally {
    await session.endSession();
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
  const session = await mongoose.startSession();

  try {
    const { orderId } = req.params;
    const { reason } = req.body || {};

    let cancelledOrder = null;

    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);

      if (!order) {
        throw createOrderError(404, "Order not found.");
      }

      if (
        order.customer.toString() !==
        req.user._id.toString()
      ) {
        throw createOrderError(
          403,
          "You can cancel only your own order."
        );
      }

      const cancellableStatuses = [
        "placed",
        "confirmed",
        "scheduled",
      ];

      if (!cancellableStatuses.includes(order.orderStatus)) {
        throw createOrderError(
          400,
          "Order cannot be cancelled after preparation starts."
        );
      }

      // Restore the item's inventory only once.
      if (!order.inventoryRestored) {
        await restoreInventoryForOrder(order, session);

        order.inventoryRestored = true;
        order.inventoryRestoredAt = new Date();
      }

      // Release the reserved arrival-time slot only once.
      if (!order.pickupSlotReleased) {
        const slotReleaseResult =
          await releasePickupSlotForOrder(order, session);

        if (slotReleaseResult.released) {
  order.pickupSlotReleased = true;
  order.pickupSlotReleasedAt = new Date();
} else if (
          slotReleaseResult.reason === "invalid_order_data"
        ) {
          throw createOrderError(
            500,
            "Could not release the pickup slot because the order timing is invalid."
          );
        }
      }

      order.orderStatus = "cancelled";

      order.statusHistory.push({
        status: "cancelled",
        at: new Date(),
        note:
          reason ||
          "Cancelled by customer before preparation",
      });

      await order.save({ session });

      cancelledOrder = order;
    });

    return res.status(200).json({
      success: true,
      message:
        "Order cancelled, inventory restored, and pickup slot released.",
      inventoryRestored:
        cancelledOrder.inventoryRestored,
      pickupSlotReleased:
        cancelledOrder.pickupSlotReleased,
      order: cancelledOrder,
    });
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) {
      console.warn(
        `CANCEL ORDER REJECTED: ${error.message}`
      );
    } else {
      console.error("CANCEL ORDER ERROR:", error);
    }

    return res
      .status(error.statusCode || 500)
      .json({
        success: false,
        message:
          error.statusCode
            ? error.message
            : "Failed to cancel order.",
      });
  } finally {
    await session.endSession();
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

