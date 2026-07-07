const Shop = require("../models/Shop");

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
    .populate("owner", "name phone email role")
    .lean();
    res.status(200).json({
      success: true,
      count: shops.length,
      shops,
    });
  } catch (error) {
    console.error("GET SHOPS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
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

    const updatedShop = await Shop.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Shop updated successfully.",
      shop: updatedShop,
    });
  } catch (error) {
    console.error("UPDATE SHOP ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};