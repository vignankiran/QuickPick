import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { getCart } from "../../services/cartService";
import { getAllShops } from "../../services/shopService";
import { placeOrder } from "../../services/orderService";
import { useAuth } from "../../context/AuthContext";

import ShopTimingDisplay from "../../components/shop/ShopTimingDisplay";
import {
  formatShopTime,
  getEnabledServiceSlots,
  getShopTimingStatus,
} from "../../utils/shopTiming";

const PICKUP_INTERVAL_MINUTES = 10;
const DEFAULT_PREPARATION_MINUTES = 10;

const Checkout = () => {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [cart, setCart] = useState(null);
  const [shop, setShop] = useState(null);

  const [pickupTime, setPickupTime] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState("");

  const normalizeCart = (data) => {
    return (
      data?.cart ||
      data?.data?.cart ||
      data?.data ||
      data ||
      null
    );
  };

  const normalizeArray = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.shops)) return data.shops;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.data?.shops)) {
      return data.data.shops;
    }

    return [];
  };

  useEffect(() => {
    if (
      isAuthenticated &&
      user?.role === "owner"
    ) {
      navigate("/owner/dashboard", {
        replace: true,
      });

      return;
    }

    if (!isAuthenticated) {
      return;
    }

    const loadCheckout = async () => {
      try {
        setLoading(true);
        setError("");

        const [cartResponse, shopsResponse] =
          await Promise.all([
            getCart(shopId),
            getAllShops(),
          ]);

        const loadedCart =
          normalizeCart(cartResponse);

        if (!loadedCart) {
          setError("Your cart was not found.");
          return;
        }

        const shops =
          normalizeArray(shopsResponse);

        const cartShop =
          typeof loadedCart.shop === "object"
            ? loadedCart.shop
            : null;

        const selectedShop =
          cartShop ||
          shops.find(
            (singleShop) =>
              singleShop._id === shopId
          );

        if (!selectedShop) {
          setError(
            "Restaurant information was not found."
          );
          return;
        }

        setCart(loadedCart);
        setShop(selectedShop);
      } catch (error) {
        setError(
          error.response?.data?.message ||
            "Failed to load checkout details."
        );
      } finally {
        setLoading(false);
      }
    };

    loadCheckout();
  }, [
    shopId,
    isAuthenticated,
    user?.role,
    navigate,
  ]);

  const cartItems = cart?.items || [];

  const getItemObject = (cartItem) => {
    if (
      cartItem &&
      typeof cartItem.item === "object"
    ) {
      return cartItem.item;
    }

    return cartItem || {};
  };

  const getItemName = (cartItem) => {
    const item = getItemObject(cartItem);

    return item.name || cartItem.name || "Item";
  };

  const getItemPrice = (cartItem) => {
    if (cartItem.price !== undefined) {
      return Number(cartItem.price);
    }

    const item = getItemObject(cartItem);

    return Number(item.price || 0);
  };

  const getSubtotal = (cartItem) => {
    if (cartItem.subtotal !== undefined) {
      return Number(cartItem.subtotal);
    }

    if (cartItem.total !== undefined) {
      return Number(cartItem.total);
    }

    return (
      getItemPrice(cartItem) *
      Number(cartItem.quantity || 0)
    );
  };

  const totalAmount =
    cart?.totalAmount ??
    cart?.total ??
    cartItems.reduce(
      (sum, cartItem) =>
        sum + getSubtotal(cartItem),
      0
    );

  const preparationMinutes = useMemo(() => {
    const preparationTimes = cartItems.map(
      (cartItem) => {
        const item = getItemObject(cartItem);

        return Number(
          item.preparationTime ||
            item.prepTime ||
            item.preparationMinutes ||
            DEFAULT_PREPARATION_MINUTES
        );
      }
    );

    if (preparationTimes.length === 0) {
      return DEFAULT_PREPARATION_MINUTES;
    }

    return Math.max(
      DEFAULT_PREPARATION_MINUTES,
      ...preparationTimes
    );
  }, [cartItems]);

  const timingStatus =
    getShopTimingStatus(shop);

  const timeToMinutes = (time) => {
    if (!time?.includes(":")) {
      return 0;
    }

    const [hours, minutes] = time
      .split(":")
      .map(Number);

    return hours * 60 + minutes;
  };

  const minutesToTime = (totalMinutes) => {
    const hours = Math.floor(
      totalMinutes / 60
    );

    const minutes = totalMinutes % 60;

    return `${String(hours).padStart(
      2,
      "0"
    )}:${String(minutes).padStart(2, "0")}`;
  };

  const roundUpToInterval = (
    minutes,
    interval
  ) => {
    return (
      Math.ceil(minutes / interval) *
      interval
    );
  };

  const getIndiaDateTime = () => {
    const formatter =
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      });

    const parts = formatter.formatToParts(
      new Date()
    );

    const getPart = (type) =>
      parts.find(
        (part) => part.type === type
      )?.value || "";

    const date = `${getPart(
      "year"
    )}-${getPart("month")}-${getPart("day")}`;

    const currentMinutes =
      Number(getPart("hour")) * 60 +
      Number(getPart("minute"));

    return {
      date,
      currentMinutes,
    };
  };

  const pickupGroups = useMemo(() => {
    if (!shop) {
      return [];
    }

    if (shop.isActive === false) {
      return [];
    }

    if (
      shop.isTemporarilyClosed === true
    ) {
      return [];
    }

    if (
      shop.temporaryClosedUntil &&
      new Date(shop.temporaryClosedUntil) >
        new Date()
    ) {
      return [];
    }

    const serviceSlots =
      getEnabledServiceSlots(shop);

    const {
      date,
      currentMinutes,
    } = getIndiaDateTime();

    const earliestPickupMinutes =
      roundUpToInterval(
        currentMinutes + preparationMinutes,
        PICKUP_INTERVAL_MINUTES
      );

    const acceptsPreOrders =
      shop.acceptsPreOrders !== false;

    return serviceSlots
      .map((slot) => {
        const openingMinutes =
          timeToMinutes(slot.openingTime);

        const closingMinutes =
          timeToMinutes(slot.closingTime);

        const isCurrentSession =
          currentMinutes >= openingMinutes &&
          currentMinutes < closingMinutes;

        const isFutureSession =
          openingMinutes > currentMinutes;

        /*
         * When the shop is open, the current
         * session is always available.
         *
         * Future sessions are available only
         * when pre-orders are enabled.
         */
        if (
          !isCurrentSession &&
          !(
            isFutureSession &&
            acceptsPreOrders
          )
        ) {
          return null;
        }

        let firstPickupMinutes =
          Math.max(
            openingMinutes,
            earliestPickupMinutes
          );

        firstPickupMinutes =
          roundUpToInterval(
            firstPickupMinutes,
            PICKUP_INTERVAL_MINUTES
          );

        const options = [];

        for (
          let minutes = firstPickupMinutes;
          minutes < closingMinutes;
          minutes += PICKUP_INTERVAL_MINUTES
        ) {
          const time =
            minutesToTime(minutes);

          options.push({
            value: `${date}T${time}`,
            label: formatShopTime(time),
            sessionName: slot.name,
          });
        }

        if (options.length === 0) {
          return null;
        }

        return {
          name: slot.name,
          openingTime: slot.openingTime,
          closingTime: slot.closingTime,
          options,
        };
      })
      .filter(Boolean);
  }, [shop, preparationMinutes]);

  const validPickupValues = useMemo(() => {
    return pickupGroups.flatMap((group) =>
      group.options.map(
        (option) => option.value
      )
    );
  }, [pickupGroups]);

  const selectedPickupOption = useMemo(() => {
    return pickupGroups
      .flatMap((group) => group.options)
      .find(
        (option) =>
          option.value === pickupTime
      );
  }, [pickupGroups, pickupTime]);

  const hasPickupTimes =
    validPickupValues.length > 0;

  const isPreOrder =
    !timingStatus.isOpen &&
    timingStatus.hasUpcomingSlot &&
    shop?.acceptsPreOrders !== false;

  const handlePlaceOrder = async (event) => {
    event.preventDefault();

    if (cartItems.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    if (!pickupTime) {
      alert(
        "Please select your arrival time."
      );
      return;
    }

    if (
      !validPickupValues.includes(
        pickupTime
      )
    ) {
      alert(
        "Please select a valid pickup time inside the restaurant's service timings."
      );
      return;
    }

    try {
      setPlacingOrder(true);

      /*
       * Convert India local datetime into an
       * exact ISO timestamp before sending it
       * to the backend.
       */
      const arrivalTime = new Date(
        `${pickupTime}:00+05:30`
      ).toISOString();

      await placeOrder({
        shop: shopId,
        arrivalTime,
        paymentMethod,
        notes: notes.trim(),
      });

      alert("Order placed successfully.");

      window.dispatchEvent(
        new Event(
          "quickpick-cart-updated"
        )
      );

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
    return (
      <div className="page-loading">
        Loading checkout...
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <h2>Checkout not available</h2>
        <p>{error}</p>

        <Link
          to="/cart"
          className="primary-link-btn"
        >
          Back to Cart
        </Link>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <Link
        to="/cart"
        className="back-link"
      >
        <ArrowLeft size={18} />
        Back to cart
      </Link>

      <div className="page-header">
        <div>
          <h1>Checkout</h1>

          <p>
            Confirm pickup details and place
            your order.
          </p>
        </div>
      </div>

      {cartItems.length === 0 ? (
        <div className="empty-state">
          <h2>Your cart is empty</h2>

          <p>
            Add items before checkout.
          </p>

          <Link
            to="/"
            className="primary-link-btn"
          >
            Browse Restaurants
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="dashboard-section">
            <h2>Pickup Details</h2>

            <div
              style={{
                marginBottom: "20px",
              }}
            >
              <h3>
                {shop?.name ||
                  "Restaurant"}
              </h3>

              <ShopTimingDisplay
                shop={shop}
              />
            </div>

            {!hasPickupTimes && (
              <div className="cart-shop-closed-message">
                <strong>
                  No pickup times available
                </strong>

                <span>
                  {shop?.acceptsPreOrders ===
                    false &&
                  !timingStatus.isOpen
                    ? "The restaurant is closed and pre-orders are currently disabled."
                    : timingStatus.message ||
                      "There are no valid pickup times remaining today."}
                </span>
              </div>
            )}

            <form
              className="inventory-form"
              onSubmit={
                handlePlaceOrder
              }
            >
              <div className="form-group">
                <label>
                  Arrival Time
                </label>

                <select
                  value={pickupTime}
                  onChange={(event) =>
                    setPickupTime(
                      event.target.value
                    )
                  }
                  disabled={
                    !hasPickupTimes
                  }
                >
                  <option value="">
                    {hasPickupTimes
                      ? "Select an arrival time"
                      : "No times available"}
                  </option>

                  {pickupGroups.map(
                    (group) => (
                      <optgroup
                        key={`${group.name}-${group.openingTime}`}
                        label={`${
                          group.name
                        } (${formatShopTime(
                          group.openingTime
                        )} – ${formatShopTime(
                          group.closingTime
                        )})`}
                      >
                        {group.options.map(
                          (option) => (
                            <option
                              key={
                                option.value
                              }
                              value={
                                option.value
                              }
                            >
                              {
                                option.label
                              }
                            </option>
                          )
                        )}
                      </optgroup>
                    )
                  )}
                </select>

                <p className="muted-text">
                  Pickup times are shown every{" "}
                  {
                    PICKUP_INTERVAL_MINUTES
                  }{" "}
                  minutes. Minimum preparation
                  time: {preparationMinutes}{" "}
                  minutes.
                </p>
              </div>

              {selectedPickupOption && (
                <div className="success-message">
                  <strong>
                    Selected session:{" "}
                    {
                      selectedPickupOption.sessionName
                    }
                  </strong>

                  <span>
                    Arrival at{" "}
                    {
                      selectedPickupOption.label
                    }
                  </span>
                </div>
              )}

              <div className="form-group">
                <label>
                  Payment Method
                </label>

                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(
                      event.target.value
                    )
                  }
                >
                  <option value="cash">
                    Cash at Counter
                  </option>

                  <option value="upi">
                    UPI
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  Notes
                </label>

                <input
                  type="text"
                  value={notes}
                  onChange={(event) =>
                    setNotes(
                      event.target.value
                    )
                  }
                  placeholder="Example: Less spicy"
                  maxLength={200}
                />
              </div>

              <button
                className="primary-btn"
                type="submit"
                disabled={
                  placingOrder ||
                  !hasPickupTimes
                }
              >
                {placingOrder
                  ? "Placing Order..."
                  : isPreOrder
                  ? "Schedule Pre-order"
                  : "Place Order"}
              </button>
            </form>
          </div>

          <div className="cart-summary">
            <h2>Order Summary</h2>

            {cartItems.map(
              (cartItem, index) => (
                <div
                  className="summary-row"
                  key={
                    cartItem._id ||
                    `${getItemName(
                      cartItem
                    )}-${index}`
                  }
                >
                  <span>
                    {getItemName(
                      cartItem
                    )}{" "}
                    × {cartItem.quantity}
                  </span>

                  <strong>
                    ₹
                    {getSubtotal(
                      cartItem
                    )}
                  </strong>
                </div>
              )
            )}

            <div className="summary-row">
              <span>Total Amount</span>

              <strong>
                ₹{totalAmount}
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;