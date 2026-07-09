const Inventory = require("../models/Inventory");
const Item = require("../models/Item");
const Shop = require("../models/Shop");
const { getLocalDate } = require("../helpers/dateHelper");


// Create or update today's inventory for an item
exports.upsertInventory = async (req, res) => {
  try {
    const {
      shop,
      item,
      date,
      preparedQuantity,
      soldQuantity,
      remainingQuantity,
      wastedQuantity,
      status,
    } = req.body;

    if (!shop || !item || !date) {
      return res.status(400).json({
        success: false,
        message: "Shop, item, and date are required.",
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
        message: "You can manage inventory only for your own shop.",
      });
    }

    const existingItem = await Item.findOne({ _id: item, shop });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: "Item not found for this shop.",
      });
    }

    const inventory = await Inventory.findOneAndUpdate(
      { shop, item, date },
      {
        preparedQuantity,
        soldQuantity,
        remainingQuantity,
        wastedQuantity,
        status,
      },
      {  returnDocument: "after", upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Inventory saved successfully.",
      inventory,
    });
  } catch (error) {
    console.error("UPSERT INVENTORY ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getInventory = async (req, res) => {
  try {
    const { shopId } = req.params;

    const inventory = await Inventory.find({
      shop: shopId,
    })
      .populate("item", "name price")
      .sort({ createdAt: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: inventory.length,
      inventory,
    });
  } catch (error) {
    console.error("GET INVENTORY ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteInventory = async (req, res) => {
  try {
    const { inventoryId } = req.params;

    const inventory = await Inventory.findById(inventoryId);

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory not found.",
      });
    }

    const shop = await Shop.findById(inventory.shop);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    if (shop.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can delete inventory only for your own shop.",
      });
    }

    await inventory.deleteOne();

    res.status(200).json({
      success: true,
      message: "Inventory deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE INVENTORY ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
exports.getAvailableInventoryByShop = async (req, res) => {
  try {
    const { shopId } = req.params;
    const today = getLocalDate();

    const inventory = await Inventory.find({
      shop: shopId,
      date: today,
      remainingQuantity: { $gt: 0 },
      status: { $ne: "sold_out" },
    })
      .populate({
        path: "item",
        select: "name slug description price category isAvailable",
        populate: {
          path: "category",
          select: "name slug displayOrder",
        },
      })
      .lean();

    const availableInventory = inventory.filter(
      (record) => record.item && record.item.isAvailable
    );

    res.status(200).json({
      success: true,
      count: availableInventory.length,
      inventory: availableInventory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch available inventory",
      error: error.message,
    });
  }
};

exports.carryForwardInventory = async (req, res) => {
  try {
    const { shopId } = req.params;
    const today = getLocalDate();

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
        message: "Not authorized to carry forward inventory for this shop",
      });
    }

    const existingTodayInventory = await Inventory.find({
      shop: shopId,
      date: today,
    }).select("item");

    const existingTodayItemIds = new Set(
      existingTodayInventory.map((record) => record.item.toString())
    );

    const previousInventory = await Inventory.find({
      shop: shopId,
      date: { $lt: today },
      preparedQuantity: { $gt: 0 },
    })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    if (previousInventory.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No previous inventory found to carry forward",
      });
    }

    const latestInventoryByItem = new Map();

    previousInventory.forEach((record) => {
      const itemId = record.item.toString();

      if (!latestInventoryByItem.has(itemId)) {
        latestInventoryByItem.set(itemId, record);
      }
    });

    const inventoryToCreate = [];

    latestInventoryByItem.forEach((record, itemId) => {
      if (existingTodayItemIds.has(itemId)) {
        return;
      }

      const preparedQuantity = record.preparedQuantity || 0;
      const soldQuantity = 0;
      const wastedQuantity = 0;
      const remainingQuantity = preparedQuantity;

      let status = "available";

      if (remainingQuantity <= 0) {
        status = "sold_out";
      } else if (remainingQuantity <= 5) {
        status = "low_stock";
      }

      inventoryToCreate.push({
        shop: shopId,
        item: record.item,
        date: today,
        preparedQuantity,
        soldQuantity,
        wastedQuantity,
        remainingQuantity,
        status,
      });
    });

    if (inventoryToCreate.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Today's inventory already exists for all previous items",
        createdCount: 0,
        inventory: [],
      });
    }

    const createdInventory = await Inventory.insertMany(inventoryToCreate);

    res.status(201).json({
      success: true,
      message: "Inventory carried forward successfully",
      createdCount: createdInventory.length,
      inventory: createdInventory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to carry forward inventory",
      error: error.message,
    });
  }
};