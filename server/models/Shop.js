const mongoose = require("mongoose");
const serviceSlotSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Timing name is required"],
      trim: true,
      maxlength: [50, "Timing name cannot exceed 50 characters"],
    },

    openingTime: {
      type: String,
      required: [true, "Opening time is required"],
      match: [
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        "Opening time must use HH:mm format",
      ],
    },

    closingTime: {
      type: String,
      required: [true, "Closing time is required"],
      match: [
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        "Closing time must use HH:mm format",
      ],
    },

    isEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: true,
  }
);
const shopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    state: {
      type: String,
      default: "Andhra Pradesh",
      trim: true,
    },

    pincode: {
      type: String,
      trim: true,
    },

    logo: {
      type: String,
      default: "",
    },

    banner: {
      type: String,
      default: "",
    },

    openingTime: {
      type: String,
      default: "06:00",
    },

    closingTime: {
      type: String,
      default: "22:00",
    },
    serviceSlots: {
      type: [serviceSlotSchema],
      default: [],
    },

    acceptsPreOrders: {
      type: Boolean,
      default: true,
    },

    maxOrdersPerSlot: {
      type: Number,
      default: 10,
    },

    isOpen: {
      type: Boolean,
      default: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    temporaryClosedUntil: {
        type: Date,
        default: null,
      },

      temporaryCloseReason: {
        type: String,
        default: "",
      },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Shop", shopSchema);