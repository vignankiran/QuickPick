const Item = require("../models/Item");
const Shop = require("../models/Shop");
const Category = require("../models/Category");

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