const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },

    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },

    date: {
      type: String,
      required: true,
    },

    preparedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    soldQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    remainingQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    wastedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["available", "low_stock", "sold_out"],
      default: "available",
    },
  },
  { timestamps: true }
);

inventorySchema.index({ shop: 1, item: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Inventory", inventorySchema);