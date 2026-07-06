const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    image: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "available",
        "low_stock",
        "sold_out",
        "coming_soon",
        "seasonal",
        "discontinued",
      ],
      default: "available",
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    preparationTime: {
      type: Number,
      default: 10,
    },

    dailyLimit: {
      type: Number,
      default: null,
    },

    remainingToday: {
      type: Number,
      default: null,
    },

    availableFrom: {
      type: String,
      default: "06:00",
    },

    availableTo: {
      type: String,
      default: "11:00",
    },

    displayOrder: {
      type: Number,
      default: 0,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    tags: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

itemSchema.index({ shop: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model("Item", itemSchema);