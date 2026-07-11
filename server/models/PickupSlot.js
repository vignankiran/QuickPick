const mongoose = require("mongoose");

const pickupSlotSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    arrivalTime: {
      type: Date,
      required: true,
    },

    slotDate: {
      type: String,
      required: true,
    },

    serviceSession: {
      type: String,
      trim: true,
      default: "",
    },

    capacity: {
      type: Number,
      required: true,
      min: 1,
    },

    bookedOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * One counter document for each shop and exact pickup time.
 *
 * Example:
 * Shop A + 7:10 PM = one unique pickup slot.
 */
pickupSlotSchema.index(
  {
    shop: 1,
    arrivalTime: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  "PickupSlot",
  pickupSlotSchema
);