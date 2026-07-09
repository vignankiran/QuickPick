const Item = require("../models/Item");
const Shop = require("../models/Shop");
const Order = require("../models/Order");
const Category = require("../models/Category");
const Inventory = require("../models/Inventory");
const Cart = require("../models/Cart");

// Create Item
exports.createItem = async (req, res) => {
  try {
   const {
        shop,
        category,
        name,
        slug,
        description,
        price,
        image,
        status,
        isAvailable,
        preparationTime,
        dailyLimit,
        remainingToday,
        availableFrom,
        availableTo,
        displayOrder,
        isFeatured,
        tags,
        } = req.body;

if (!shop || !category || !name || !slug || price === undefined) {      return res.status(400).json({
        success: false,
        message: "Shop, category, name, slug, and price are required.",
      });
    }

    const existingShop = await Shop.findById(shop);

    if (!existingShop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    if (existingShop.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can add items only to your own shop.",
      });
    }

    const existingCategory = await Category.findOne({
      _id: category,
      shop,
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found for this shop.",
      });
    }
    const existingItem = await Item.findOne({
        shop,
        slug,
      });

      if (existingItem) {
        return res.status(400).json({
          success: false,
          message: "Item slug already exists for this shop.",
        });
      }

    const item = await Item.create({
      shop,
      category,
      name,
      description,
      price,
      image,
      isAvailable,
      preparationTime,
      slug,
        status,
        dailyLimit,
        remainingToday,
        availableFrom,
        availableTo,
        displayOrder,
        isFeatured,
        tags,
    });

    res.status(201).json({
      success: true,
      message: "Item created successfully.",
      item,
    });
  } catch (error) {
    console.error("CREATE ITEM ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
exports.getItemsByShop = async (req, res) => {
  try {
    const { shopId } = req.params;

    const items = await Item.find({ shop: shopId })
      .populate("category", "name slug")
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error) {
    console.error("GET ITEMS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await Item.findById(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found.",
      });
    }

    const shop = await Shop.findById(item.shop);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    if (shop.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can update only your own shop items.",
      });
    }

    const updatedItem = await Item.findByIdAndUpdate(
      itemId,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Item updated successfully.",
      item: updatedItem,
    });
  } catch (error) {
    console.error("UPDATE ITEM ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
exports.deleteItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await Item.findById(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    const shop = await Shop.findById(item.shop);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    if (shop.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this item",
      });
    }

    const usedInOrder = await Order.exists({
      "items.item": itemId,
    });

    if (usedInOrder) {
      item.isAvailable = false;
      await item.save();

      return res.status(200).json({
        success: true,
        message:
          "Item is used in past orders, so it was deactivated instead of deleted",
      });
    }

    await Inventory.deleteMany({ item: itemId });

    await Cart.updateMany(
      { "items.item": itemId },
      {
        $pull: {
          items: { item: itemId },
        },
      }
    );

    await Item.findByIdAndDelete(itemId);

    res.status(200).json({
      success: true,
      message: "Item deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete item",
      error: error.message,
    });
  }
};