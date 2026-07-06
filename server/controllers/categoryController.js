const Category = require("../models/Category");
const Shop = require("../models/Shop");

// Create Category
exports.createCategory = async (req, res) => {
  try {
    const { shop, name, slug, description, displayOrder } = req.body;

    if (!shop || !name || !slug) {
      return res.status(400).json({
        success: false,
        message: "Shop, name, and slug are required.",
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
        message: "You can create categories only for your own shop.",
      });
    }

    const category = await Category.create({
      shop,
      name,
      slug,
      description,
      displayOrder,
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully.",
      category,
    });
  } catch (error) {
    console.error("CREATE CATEGORY ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getCategoriesByShop = async (req, res) => {
  try {
    const { shopId } = req.params;

    const categories = await Category.find({
      shop: shopId,
      isActive: true,
    }).sort({ displayOrder: 1, name: 1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error("GET CATEGORIES ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};