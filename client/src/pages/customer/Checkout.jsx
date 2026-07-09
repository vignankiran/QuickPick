import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { getCart } from "../../services/cartService";
import { placeOrder } from "../../services/orderService";
import { useAuth } from "../../context/AuthContext";

const Checkout = () => {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [cart, setCart] = useState(null);
  const [pickupTime, setPickupTime] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
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
          "Failed to load checkout details."
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

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (cartItems.length === 0) {
      alert("Your cart is empty.");
      return;
    }
    if (!pickupTime) {
        alert("Please select your arrival time.");
        return;
}

    try {
      setPlacingOrder(true);

      await placeOrder({
        shop: shopId,
        arrivalTime: pickupTime,
        paymentMethod,
        notes,
        });

      localStorage.removeItem("quickpick_cart_shop");

      alert("Order placed successfully.");
      navigate("/my-orders");
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to place order. Please try again."
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return <div className="page-loading">Loading checkout...</div>;
  }

  if (error) {
    return (
      <div className="empty-state">
        <h2>Checkout not available</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <Link to={`/cart/${shopId}`} className="back-link">
        <ArrowLeft size={18} />
        Back to cart
      </Link>

      <div className="page-header">
        <div>
          <h1>Checkout</h1>
          <p>Confirm pickup details and place your order.</p>
        </div>
      </div>

      {cartItems.length === 0 ? (
        <div className="empty-state">
          <h2>Your cart is empty</h2>
          <p>Add items before checkout.</p>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="dashboard-section">
            <h2>Pickup Details</h2>

            <form className="inventory-form" onSubmit={handlePlaceOrder}>
              <div className="form-group">
                <label>Pickup Time</label>
                <input
                  type="datetime-local"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="cash">Cash at Counter</option>
                  <option value="upi">UPI</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Example: Less spicy"
                />
              </div>

              <button
                className="primary-btn"
                type="submit"
                disabled={placingOrder}
              >
                {placingOrder ? "Placing Order..." : "Place Order"}
              </button>
            </form>
          </div>

          <div className="cart-summary">
            <h2>Order Summary</h2>

            {cartItems.map((cartItem, index) => (
              <div className="summary-row" key={index}>
                <span>
                  {getItemName(cartItem)} × {cartItem.quantity}
                </span>
                <strong>₹{getSubtotal(cartItem)}</strong>
              </div>
            ))}

            <div className="summary-row">
              <span>Total Amount</span>
              <strong>₹{totalAmount}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;