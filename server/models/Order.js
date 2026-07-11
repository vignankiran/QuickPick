const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: function (items) {
          return items.length > 0;
        },
        message: "Order must have at least one item",
      },
    },

    arrivalTime: {
      type: Date,
      required: true,
    },

    kitchenStartTime: {
      type: Date,
    },

    expectedReadyTime: {
      type: Date,
    },

    actualReadyTime: {
      type: Date,
    },

    pickupTime: {
      type: Date,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "online"],
      default: "cash",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    orderStatus: {
      type: String,
      enum: [
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
      ],
      default: "placed",
    },
    inventoryRestored: {
      type: Boolean,
      default: false,
    },

    inventoryRestoredAt: {
      type: Date,
      default: null,
    },
    pickupSlotReleased: {
  type: Boolean,
  default: false,
},

pickupSlotReleasedAt: {
  type: Date,
  default: null,
},
    customerNote: {
      type: String,
      default: "",
    },

    ownerNote: {
      type: String,
      default: "",
    },

    statusHistory: [
      {
        status: {
          type: String,
        },
        at: {
          type: Date,
          default: Date.now,
        },
        note: {
          type: String,
          default: "",
        },
      },
    ],
  },
  { timestamps: true }
);

orderSchema.pre("save", async function () {
  if (!this.orderNumber) {
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    this.orderNumber = `QP-${Date.now()}-${randomNumber}`;
  }

  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: this.orderStatus,
      at: new Date(),
      note: "Order placed",
    });
  }
});

module.exports = mongoose.model("Order", orderSchema);