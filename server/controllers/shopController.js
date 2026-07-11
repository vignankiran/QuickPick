const Shop = require("../models/Shop");
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const validateServiceSlots = (serviceSlots) => {
  if (!Array.isArray(serviceSlots)) {
    return {
      valid: false,
      message: "Service timings must be an array.",
    };
  }

  if (serviceSlots.length > 10) {
    return {
      valid: false,
      message: "A shop can have a maximum of 10 timing sessions.",
    };
  }

  const cleanedSlots = [];

  for (let index = 0; index < serviceSlots.length; index += 1) {
    const slot = serviceSlots[index];

    const name = String(slot?.name || "").trim();
    const openingTime = String(slot?.openingTime || "");
    const closingTime = String(slot?.closingTime || "");
    const isEnabled = slot?.isEnabled !== false;

    if (!name) {
      return {
        valid: false,
        message: `Timing ${index + 1} must have a name.`,
      };
    }

    if (!TIME_PATTERN.test(openingTime)) {
      return {
        valid: false,
        message: `${name} opening time must use HH:mm format.`,
      };
    }

    if (!TIME_PATTERN.test(closingTime)) {
      return {
        valid: false,
        message: `${name} closing time must use HH:mm format.`,
      };
    }

    if (timeToMinutes(closingTime) <= timeToMinutes(openingTime)) {
      return {
        valid: false,
        message: `${name} closing time must be later than its opening time.`,
      };
    }

    const cleanedSlot = {
      name,
      openingTime,
      closingTime,
      isEnabled,
    };

    if (slot?._id) {
      cleanedSlot._id = slot._id;
    }

    cleanedSlots.push(cleanedSlot);
  }

  const enabledSlots = cleanedSlots
    .filter((slot) => slot.isEnabled)
    .sort(
      (first, second) =>
        timeToMinutes(first.openingTime) -
        timeToMinutes(second.openingTime)
    );

  for (let index = 1; index < enabledSlots.length; index += 1) {
    const previousSlot = enabledSlots[index - 1];
    const currentSlot = enabledSlots[index];

    if (
      timeToMinutes(currentSlot.openingTime) <
      timeToMinutes(previousSlot.closingTime)
    ) {
      return {
        valid: false,
        message: `${previousSlot.name} and ${currentSlot.name} timings overlap.`,
      };
    }
  }

  return {
    valid: true,
    slots: cleanedSlots,
  };
};
// Create Shop
exports.createShop = async (req, res) => {
  try {
    const {
      name,
      slug,
      phone,
      email,
      address,
      city,
      state,
      pincode,
      openingTime,
      closingTime,
    } = req.body;

    if (!name || !slug || !phone || !address || !city) {
      return res.status(400).json({
        success: false,
        message: "Name, slug, phone, address, and city are required.",
      });
    }

    const existingShop = await Shop.findOne({ slug });

    if (existingShop) {
      return res.status(400).json({
        success: false,
        message: "Shop slug already exists.",
      });
    }

    const shop = await Shop.create({
      name,
      slug,
      owner: req.user._id,
      phone,
      email,
      address,
      city,
      state,
      pincode,
      openingTime,
      closingTime,
    });

    res.status(201).json({
      success: true,
      message: "Shop created successfully.",
      shop,
    });
  } catch (error) {
    console.error("CREATE SHOP ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
exports.getShops = async (req, res) => {
  try {
    const shops = await Shop.find({ isActive: true })
      .populate("owner", "name phone email")
      .lean();

    const now = new Date();

    const formattedShops = shops.map((shop) => ({
      ...shop,
      isTemporarilyClosed:
        shop.temporaryClosedUntil &&
        new Date(shop.temporaryClosedUntil) > now,
    }));

    res.status(200).json({
      success: true,
      count: formattedShops.length,
      shops: formattedShops,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch shops",
      error: error.message,
    });
  }
};

exports.updateShop = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    if (shop.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can update only your own shop.",
      });
    }
      let validatedServiceSlots;

      if (req.body.serviceSlots !== undefined) {
        const timingValidation = validateServiceSlots(
          req.body.serviceSlots
        );

        if (!timingValidation.valid) {
          return res.status(400).json({
            success: false,
            message: timingValidation.message,
          });
        }

        validatedServiceSlots = timingValidation.slots;
      }
    const allowedUpdates = {
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email,
      address: req.body.address,
      city: req.body.city,
      state: req.body.state,
      pincode: req.body.pincode,
      openingTime: req.body.openingTime,
      closingTime: req.body.closingTime,
      serviceSlots: validatedServiceSlots,
      acceptsPreOrders: req.body.acceptsPreOrders,
      maxOrdersPerSlot: req.body.maxOrdersPerSlot,
    };

    // Remove fields that were not sent.
    Object.keys(allowedUpdates).forEach((key) => {
      if (allowedUpdates[key] === undefined) {
        delete allowedUpdates[key];
      }
    });

    const updatedShop = await Shop.findByIdAndUpdate(
      req.params.id,
      allowedUpdates,
      {
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Shop updated successfully.",
      shop: updatedShop,
    });
  } catch (error) {
    console.error("UPDATE SHOP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update shop.",
    });
  }
};
exports.temporaryCloseShop = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { closedUntil, reason } = req.body;

    if (!closedUntil) {
      return res.status(400).json({
        success: false,
        message: "Closed until time is required",
      });
    }

    const closeUntilDate = new Date(closedUntil);

    if (closeUntilDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Closed until time must be in the future",
      });
    }

    const shop = await Shop.findById(shopId);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    if (shop.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to close this shop",
      });
    }

    shop.temporaryClosedUntil = closeUntilDate;
    shop.temporaryCloseReason = reason || "Temporarily closed";

    await shop.save();

    res.status(200).json({
      success: true,
      message: "Shop temporarily closed successfully",
      shop,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to temporarily close shop",
      error: error.message,
    });
  }
};

exports.reopenShop = async (req, res) => {
  try {
    const { shopId } = req.params;

    const shop = await Shop.findById(shopId);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    if (shop.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to reopen this shop",
      });
    }

    shop.temporaryClosedUntil = null;
    shop.temporaryCloseReason = "";

    await shop.save();

    res.status(200).json({
      success: true,
      message: "Shop reopened successfully",
      shop,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to reopen shop",
      error: error.message,
    });
  }
};