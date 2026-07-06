const Inventory = require("../models/Inventory");
const Item = require("../models/Item");
const Shop = require("../models/Shop");

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
      { new: true, upsert: true, runValidators: true }
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