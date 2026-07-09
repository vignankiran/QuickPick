import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";

import {
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "../../services/cartService";
import { useAuth } from "../../context/AuthContext";

const Cart = () => {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [error, setError] = useState("");

  const normalizeCart = (data) => {
    return data?.cart || data?.data?.cart || data?.data || data || null;
  };

  const loadCart = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getCart(shopId);
      setCart(normalizeCart(response));
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to load cart. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === "owner") {
      navigate("/owner/dashboard", { replace: true });
      return;
    }

    if (isAuthenticated) {
      loadCart();
    }
  }, [shopId, isAuthenticated, user]);

  const cartItems = cart?.items || [];

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
    if (typeof cartItem.item === "object") {
      return cartItem.item?.price || 0;
    }

    return cartItem.price || 0;
  };

  const getSubtotal = (cartItem) => {
    return (
      cartItem.subtotal ||
      cartItem.total ||
      getItemPrice(cartItem) * cartItem.quantity
    );
  };

  const totalAmount =
    cart?.totalAmount ||
    cart?.total ||
    cartItems.reduce((sum, cartItem) => sum + getSubtotal(cartItem), 0);

  const handleQuantityChange = async (cartItem, newQuantity) => {
    const itemId = getItemId(cartItem);

    if (!itemId) {
      alert("Item ID not found.");
      return;
    }

    if (newQuantity < 1) {
      await handleRemoveItem(cartItem);
      return;
    }

    try {
      setUpdatingItemId(itemId);

      await updateCartItem({
        shop: shopId,
        item: itemId,
        quantity: newQuantity,
      });

      await loadCart();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to update quantity. Please try again."
      );
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveItem = async (cartItem) => {
    const itemId = getItemId(cartItem);

    if (!itemId) {
      alert("Item ID not found.");
      return;
    }

    try {
      setUpdatingItemId(itemId);

      await removeCartItem({
        shop: shopId,
        item: itemId,
      });

      await loadCart();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to remove item. Please try again."
      );
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleClearCart = async () => {
    const confirmClear = window.confirm("Are you sure you want to clear cart?");

    if (!confirmClear) return;

    try {
      await clearCart(shopId);
      await loadCart();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to clear cart. Please try again."
      );
    }
  };

  if (loading) {
    return <div className="page-loading">Loading cart...</div>;
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
    <div className="cart-page">
      <Link to={`/shops/${shopId}`} className="back-link">
        <ArrowLeft size={18} />
        Back to menu
      </Link>

      <div className="page-header">
        <div>
          <h1>Your Cart</h1>
          <p>Review your items before placing the order.</p>
        </div>
      </div>

      {cartItems.length === 0 ? (
        <div className="empty-state">
          <h2>Your cart is empty</h2>
          <p>Add items from the restaurant menu to continue.</p>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items-list">
            {cartItems.map((cartItem) => {
              const itemId = getItemId(cartItem);

              return (
                <div className="cart-item-card" key={itemId}>
                  <div>
                    <h3>{getItemName(cartItem)}</h3>
                    <p>₹{getItemPrice(cartItem)} each</p>
                    <strong>Subtotal: ₹{getSubtotal(cartItem)}</strong>
                  </div>

                  <div className="cart-actions">
                    <button
                      className="quantity-btn"
                      disabled={updatingItemId === itemId}
                      onClick={() =>
                        handleQuantityChange(
                          cartItem,
                          cartItem.quantity - 1
                        )
                      }
                    >
                      <Minus size={16} />
                    </button>

                    <span>{cartItem.quantity}</span>

                    <button
                      className="quantity-btn"
                      disabled={updatingItemId === itemId}
                      onClick={() =>
                        handleQuantityChange(
                          cartItem,
                          cartItem.quantity + 1
                        )
                      }
                    >
                      <Plus size={16} />
                    </button>

                    <button
                      className="danger-btn"
                      disabled={updatingItemId === itemId}
                      onClick={() => handleRemoveItem(cartItem)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="cart-summary">
            <h2>Order Summary</h2>

            <div className="summary-row">
              <span>Total Items</span>
              <strong>{cartItems.length}</strong>
            </div>

            <div className="summary-row">
              <span>Total Amount</span>
              <strong>₹{totalAmount}</strong>
            </div>

            <button
                className="primary-btn checkout-btn"
                onClick={() => navigate(`/checkout/${shopId}`)}
                >
                Proceed to Checkout
                </button>

            <button className="clear-cart-btn" onClick={handleClearCart}>
              Clear Cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;