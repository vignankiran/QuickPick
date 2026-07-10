import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Minus,
  Plus,
  Store,
  Trash2,
  ShoppingBag,
} from "lucide-react";

import {
  getMyCarts,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "../../services/cartService";

const CartLanding = () => {
  const navigate = useNavigate();

  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState("");
  const [clearingShopId, setClearingShopId] = useState("");
  const [error, setError] = useState("");

  const normalizeArray = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.carts)) return data.carts;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.data?.carts)) return data.data.carts;
    return [];
  };

  const loadCarts = async (showPageLoader = true) => {
    try {
      if (showPageLoader) {
        setLoading(true);
      }

      setError("");

      const response = await getMyCarts();
      setCarts(normalizeArray(response));
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to load your carts. Please try again."
      );
    } finally {
      if (showPageLoader) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadCarts();
  }, []);

  const getShopId = (cart) => {
    if (typeof cart.shop === "object") {
      return cart.shop?._id || cart.shop?.id;
    }

    return cart.shop;
  };

  const getShopName = (cart) => {
    if (typeof cart.shop === "object") {
      return cart.shop?.name || "Restaurant";
    }

    return "Restaurant";
  };

  const getItemId = (cartItem) => {
    if (typeof cartItem.item === "object") {
      return cartItem.item?._id || cartItem.item?.id;
    }

    return cartItem.item;
  };

  const getItemName = (cartItem) => {
    if (typeof cartItem.item === "object") {
      return cartItem.item?.name || "Item";
    }

    return cartItem.name || "Item";
  };

  const getItemPrice = (cartItem) => {
    if (cartItem.price !== undefined) {
      return Number(cartItem.price);
    }

    if (typeof cartItem.item === "object") {
      return Number(cartItem.item?.price || 0);
    }

    return 0;
  };

  const getItemSubtotal = (cartItem) => {
    if (cartItem.subtotal !== undefined) {
      return Number(cartItem.subtotal);
    }

    if (cartItem.total !== undefined) {
      return Number(cartItem.total);
    }

    return getItemPrice(cartItem) * Number(cartItem.quantity || 0);
  };

  const getCartTotal = (cart) => {
    if (cart.totalAmount !== undefined) {
      return Number(cart.totalAmount);
    }

    if (cart.total !== undefined) {
      return Number(cart.total);
    }

    return (cart.items || []).reduce(
      (sum, cartItem) => sum + getItemSubtotal(cartItem),
      0
    );
  };

  const getCartQuantity = (cart) => {
    return (cart.items || []).reduce(
      (sum, cartItem) => sum + Number(cartItem.quantity || 0),
      0
    );
  };

  const isShopClosed = (shop) => {
    if (!shop || shop.isActive === false) {
      return true;
    }

    return (
      shop.temporaryClosedUntil &&
      new Date(shop.temporaryClosedUntil) > new Date()
    );
  };

  const handleQuantityChange = async (
    shopId,
    cartItem,
    newQuantity
  ) => {
    const itemId = getItemId(cartItem);

    if (!itemId) {
      alert("Item ID was not found.");
      return;
    }

    if (newQuantity < 1) {
      await handleRemoveItem(shopId, cartItem);
      return;
    }

    const updateKey = `${shopId}-${itemId}`;

    try {
      setUpdatingKey(updateKey);

      await updateCartItem({
        shop: shopId,
        item: itemId,
        quantity: newQuantity,
      });

      await loadCarts(false);
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to update item quantity."
      );
    } finally {
      setUpdatingKey("");
    }
  };

  const handleRemoveItem = async (shopId, cartItem) => {
    const itemId = getItemId(cartItem);

    if (!itemId) {
      alert("Item ID was not found.");
      return;
    }

    const updateKey = `${shopId}-${itemId}`;

    try {
      setUpdatingKey(updateKey);

      await removeCartItem({
        shop: shopId,
        item: itemId,
      });

      await loadCarts(false);
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to remove item from cart."
      );
    } finally {
      setUpdatingKey("");
    }
  };

  const handleClearCart = async (shopId) => {
    const confirmClear = window.confirm(
      "Clear all items from this restaurant's cart?"
    );

    if (!confirmClear) return;

    try {
      setClearingShopId(shopId);

      await clearCart(shopId);
      await loadCarts(false);
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to clear this cart."
      );
    } finally {
      setClearingShopId("");
    }
  };

  if (loading) {
    return <div className="page-loading">Loading your carts...</div>;
  }

  if (error) {
    return (
      <div className="empty-state">
        <h2>Cart not available</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="multi-cart-page">
      <div className="page-header">
        <div>
          <h1>Your Cart</h1>
          <p>
            Items are grouped by restaurant and checked out separately.
          </p>
        </div>
      </div>

      {carts.length === 0 ? (
        <div className="empty-state">
          <ShoppingBag size={34} />

          <h2>Your cart is empty</h2>

          <p>
            Choose a restaurant and add food items to continue.
          </p>

          <Link to="/" className="primary-link-btn">
            Browse Restaurants
          </Link>
        </div>
      ) : (
        <div className="multi-cart-list">
          {carts.map((cart) => {
            const shopId = getShopId(cart);
            const shop = cart.shop;
            const cartItems = cart.items || [];
            const shopClosed = isShopClosed(shop);

            return (
              <section className="shop-cart-card" key={cart._id}>
                <div className="shop-cart-header">
                  <div className="shop-cart-title">
                    <div className="shop-cart-icon">
                      <Store size={22} />
                    </div>

                    <div>
                      <h2>{getShopName(cart)}</h2>

                      <p>
                        {shop?.address || shop?.city || "Location not added"}
                      </p>
                    </div>
                  </div>

                  <div className="shop-cart-header-actions">
                    <span>
                      {getCartQuantity(cart)} item
                      {getCartQuantity(cart) !== 1 ? "s" : ""}
                    </span>

                    <button
                      className="clear-shop-cart-btn"
                      disabled={clearingShopId === shopId}
                      onClick={() => handleClearCart(shopId)}
                    >
                      {clearingShopId === shopId
                        ? "Clearing..."
                        : "Clear Cart"}
                    </button>
                  </div>
                </div>

                {shopClosed && (
                  <div className="cart-shop-closed-message">
                    <strong>Restaurant is currently closed.</strong>

                    <span>
                      {shop?.temporaryCloseReason ||
                        "This restaurant is not accepting orders right now."}
                    </span>
                  </div>
                )}

                <div className="shop-cart-items">
                  {cartItems.map((cartItem) => {
                    const itemId = getItemId(cartItem);
                    const itemUpdateKey = `${shopId}-${itemId}`;
                    const isUpdating =
                      updatingKey === itemUpdateKey;

                    return (
                      <div
                        className="multi-cart-item"
                        key={itemId || cartItem._id}
                      >
                        <div>
                          <h3>{getItemName(cartItem)}</h3>

                          <p>₹{getItemPrice(cartItem)} each</p>

                          <strong>
                            Subtotal: ₹{getItemSubtotal(cartItem)}
                          </strong>
                        </div>

                        <div className="cart-actions">
                          <button
                            className="quantity-btn"
                            disabled={isUpdating}
                            onClick={() =>
                              handleQuantityChange(
                                shopId,
                                cartItem,
                                Number(cartItem.quantity) - 1
                              )
                            }
                          >
                            <Minus size={16} />
                          </button>

                          <span>{cartItem.quantity}</span>

                          <button
                            className="quantity-btn"
                            disabled={isUpdating}
                            onClick={() =>
                              handleQuantityChange(
                                shopId,
                                cartItem,
                                Number(cartItem.quantity) + 1
                              )
                            }
                          >
                            <Plus size={16} />
                          </button>

                          <button
                            className="danger-btn"
                            disabled={isUpdating}
                            onClick={() =>
                              handleRemoveItem(shopId, cartItem)
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="shop-cart-footer">
                  <div>
                    <p>Restaurant Total</p>
                    <h2>₹{getCartTotal(cart)}</h2>
                  </div>

                  <button
                    className="primary-btn"
                    disabled={shopClosed}
                    onClick={() =>
                      navigate(`/checkout/${shopId}`)
                    }
                  >
                    {shopClosed
                      ? "Currently Closed"
                      : "Proceed to Checkout"}
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CartLanding;