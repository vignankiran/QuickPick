const Cart = require("../models/Cart");
const Item = require("../models/Item");

// Add item to cart
exports.addToCart = async (req, res) => {
  try {
    const { shop, item, quantity } = req.body;
   
    if (!shop || !item || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Shop, item, and quantity are required.",
      });
    }

    const menuItem = await Item.findOne({
  _id: item,
  shop: shop,
});



if (!menuItem || menuItem.status !== "available" || menuItem.isAvailable !== true) {
  return res.status(404).json({
    success: false,
    message: "Item not available.",
  });
}


    let cart = await Cart.findOne({
      customer: req.user._id,
      shop,
    });

    if (!cart) {
      cart = await Cart.create({
        customer: req.user._id,
        shop,
        items: [],
        totalAmount: 0,
      });
    }

    const existingItem = cart.items.find(
      (cartItem) => cartItem.item.toString() === item
    );

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.subtotal = existingItem.quantity * existingItem.price;
    } else {
      cart.items.push({
        item,
        name: menuItem.name,
        price: menuItem.price,
        quantity,
        subtotal: menuItem.price * quantity,
      });
    }

    cart.totalAmount = cart.items.reduce(
      (total, cartItem) => total + cartItem.subtotal,
      0
    );

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Item added to cart.",
      cart,
    });
  } catch (error) {
    console.error("ADD TO CART ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getCart = async (req, res) => {
  try {
    const { shopId } = req.params;

    const cart = await Cart.findOne({
      customer: req.user._id,
      shop: shopId,
    }).populate("items.item", "name price image status isAvailable")
    .lean();

    if (!cart) {
      return res.status(200).json({
        success: true,
        cart: {
          items: [],
          totalAmount: 0,
        },
      });
    }

    res.status(200).json({
      success: true,
      cart,
    });
  } catch (error) {
    console.error("GET CART ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    const { shop, item, quantity } = req.body;

    if (!shop || !item || !quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Shop, item, and valid quantity are required.",
      });
    }

    const cart = await Cart.findOne({
      customer: req.user._id,
      shop,
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found.",
      });
    }

    const cartItem = cart.items.find(
      (cartItem) => cartItem.item.toString() === item
    );

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart.",
      });
    }

    cartItem.quantity = quantity;
    cartItem.subtotal = cartItem.price * quantity;

    cart.totalAmount = cart.items.reduce(
      (total, cartItem) => total + cartItem.subtotal,
      0
    );

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cart updated successfully.",
      cart,
    });
  } catch (error) {
    console.error("UPDATE CART ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.removeCartItem = async (req, res) => {
  try {
    const { shop, item } = req.body;

    if (!shop || !item) {
      return res.status(400).json({
        success: false,
        message: "Shop and item are required.",
      });
    }

    const cart = await Cart.findOne({
      customer: req.user._id,
      shop,
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found.",
      });
    }

    cart.items = cart.items.filter(
      (cartItem) => cartItem.item.toString() !== item
    );

    cart.totalAmount = cart.items.reduce(
      (total, cartItem) => total + cartItem.subtotal,
      0
    );

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Item removed from cart.",
      cart,
    });
  } catch (error) {
    console.error("REMOVE CART ITEM ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.clearCart = async (req, res) => {
  try {
    const { shop } = req.body;

    if (!shop) {
      return res.status(400).json({
        success: false,
        message: "Shop is required.",
      });
    }

    const cart = await Cart.findOne({
      customer: req.user._id,
      shop,
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found.",
      });
    }

    cart.items = [];
    cart.totalAmount = 0;

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cart cleared successfully.",
      cart,
    });
  } catch (error) {
    console.error("CLEAR CART ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};