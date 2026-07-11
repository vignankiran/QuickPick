import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { getAllShops } from "../../services/shopService";
import {
  getShopOrders,
  updateOrderStatus,
} from "../../services/orderService";
import { useAuth } from "../../context/AuthContext";

const statusTransitions = {
  placed: [
    "confirmed",
    "cancelled",
    "rejected",
    "expired",
  ],

  scheduled: [
    "confirmed",
    "cancelled",
    "rejected",
    "expired",
  ],

  confirmed: [
    "preparing",
    "cancelled",
    "rejected",
    "expired",
  ],

  preparing: ["ready"],

  ready: [
    "customer_arrived",
    "handed_over",
  ],

  customer_arrived: ["handed_over"],

  handed_over: ["completed"],

  completed: [],
  cancelled: [],
  rejected: [],
  expired: [],
};

const getStatusOptions = (currentStatus) => {
  return [
    currentStatus,
    ...(statusTransitions[currentStatus] || []),
  ];
};

const activePreparationStatuses = [
  "preparing",
  "ready",
  "customer_arrived",
  "handed_over",
  "completed",
];

const Orders = () => {
  const { user } = useAuth();

  const [shop, setShop] = useState(null);
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [error, setError] = useState("");

  const [currentTime, setCurrentTime] = useState(new Date());

  const getUserId = () => user?._id || user?.id;

  const normalizeArray = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.orders)) return data.orders;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.data?.orders)) {
      return data.data.orders;
    }
    if (Array.isArray(data?.shops)) return data.shops;
    if (Array.isArray(data?.data?.shops)) {
      return data.data.shops;
    }

    return [];
  };

  const loadOrders = async (showPageLoader = true) => {
    try {
      if (showPageLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const shopResponse = await getAllShops();
      const shops = normalizeArray(shopResponse);

      const userShopId =
        typeof user?.shop === "object"
          ? user.shop?._id || user.shop?.id
          : user?.shop;

      const ownerShop = shops.find((singleShop) => {
        const ownerId =
          typeof singleShop.owner === "object"
            ? singleShop.owner?._id || singleShop.owner?.id
            : singleShop.owner;

        return (
          singleShop._id === userShopId ||
          ownerId === getUserId()
        );
      });

      const shopId = ownerShop?._id || userShopId;

      if (!shopId) {
        setError("No shop found for this owner account.");
        return;
      }

      setShop(
        ownerShop || {
          _id: shopId,
          name: "Your Shop",
        }
      );

      const ordersResponse = await getShopOrders(shopId);
      const loadedOrders = normalizeArray(ordersResponse);

      loadedOrders.sort((firstOrder, secondOrder) => {
        const firstArrival = firstOrder.arrivalTime
          ? new Date(firstOrder.arrivalTime).getTime()
          : Number.MAX_SAFE_INTEGER;

        const secondArrival = secondOrder.arrivalTime
          ? new Date(secondOrder.arrivalTime).getTime()
          : Number.MAX_SAFE_INTEGER;

        return firstArrival - secondArrival;
      });

      setOrders(loadedOrders);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to load orders. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      setUpdatingOrderId(orderId);

      await updateOrderStatus(orderId, newStatus);

      setOrders((previousOrders) =>
        previousOrders.map((order) =>
          order._id === orderId
            ? {
                ...order,
                orderStatus: newStatus,
              }
            : order
        )
      );
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to update order status. Please try again."
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const getISTDate = (dateValue) => {
    if (!dateValue) return "";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
  };

  const formatISTDateTime = (dateValue) => {
    if (!dateValue) return "Not available";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Invalid time";
    }

    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatISTTime = (dateValue) => {
    if (!dateValue) return "Not available";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Invalid time";
    }

    return date.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getOrderShortId = (order) => {
    if (order.orderNumber) {
      return order.orderNumber;
    }

    if (!order._id) {
      return "Order";
    }

    return `#${order._id.slice(-6).toUpperCase()}`;
  };

  const getItemName = (orderItem) => {
    if (typeof orderItem.item === "object") {
      return (
        orderItem.item?.name ||
        orderItem.name ||
        "Item"
      );
    }

    return orderItem.name || "Item";
  };

  const getPreparationMessage = (order) => {
    if (
      activePreparationStatuses.includes(order.orderStatus)
    ) {
      if (order.orderStatus === "preparing") {
        return {
          text: "Preparation started",
          className: "preparation-now",
        };
      }

      if (order.orderStatus === "ready") {
        return {
          text: "Order is ready",
          className: "preparation-ready",
        };
      }

      if (order.orderStatus === "customer_arrived") {
        return {
          text: "Customer arrived",
          className: "preparation-ready",
        };
      }

      return {
        text: order.orderStatus.replaceAll("_", " "),
        className: "preparation-ready",
      };
    }

    if (!order.kitchenStartTime) {
      return {
        text: "Preparation time unavailable",
        className: "preparation-later",
      };
    }

    const kitchenStartTime = new Date(
      order.kitchenStartTime
    );

    const arrivalTime = order.arrivalTime
      ? new Date(order.arrivalTime)
      : null;

    if (Number.isNaN(kitchenStartTime.getTime())) {
      return {
        text: "Preparation time unavailable",
        className: "preparation-later",
      };
    }

    const differenceMinutes = Math.ceil(
      (kitchenStartTime.getTime() -
        currentTime.getTime()) /
        60000
    );

    if (differenceMinutes > 0) {
      return {
        text: `Start preparing in ${differenceMinutes} min`,
        className: "preparation-later",
      };
    }

    if (
      arrivalTime &&
      !Number.isNaN(arrivalTime.getTime()) &&
      currentTime < arrivalTime
    ) {
      return {
        text: "Start preparing now",
        className: "preparation-now",
      };
    }

    return {
      text: "Arrival time reached",
      className: "preparation-overdue",
    };
  };

  const todayIST = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

  const todayOrders = orders.filter((order) => {
    return (
      getISTDate(order.arrivalTime || order.createdAt) ===
      todayIST
    );
  });

  const filteredOrders =
    filter === "today" ? todayOrders : orders;

  if (loading) {
    return (
      <div className="page-loading">
        Loading orders...
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <h2>Orders not available</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="page-header">
        <div>
          <h1>Orders</h1>

          <p>
            {shop?.name
              ? `Manage orders for ${shop.name}`
              : "Manage customer orders"}
          </p>
        </div>

        <button
          type="button"
          className="primary-btn orders-refresh-btn"
          disabled={refreshing}
          onClick={() => loadOrders(false)}
        >
          <RefreshCw
            size={17}
            className={refreshing ? "spin-icon" : ""}
          />

          {refreshing ? "Refreshing..." : "Refresh Orders"}
        </button>
      </div>

      <div className="filter-tabs">
        <button
          className={
            filter === "all"
              ? "filter-tab active"
              : "filter-tab"
          }
          onClick={() => setFilter("all")}
        >
          Active Orders ({orders.length})
        </button>

        <button
          className={
            filter === "today"
              ? "filter-tab active"
              : "filter-tab"
          }
          onClick={() => setFilter("today")}
        >
          Today&apos;s Pickups ({todayOrders.length})
        </button>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="empty-state">
          <h2>No active orders</h2>

          <p>
            Customer orders will appear here once they
            place an order.
          </p>
        </div>
      ) : (
        <div className="table-card orders-table-wrapper">
          <table className="orders-table owner-orders-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Arrival</th>
                <th>Kitchen Timing</th>
                <th>Total</th>
                <th>Status</th>
                <th>Payment</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((order) => {
                const preparationMessage =
                  getPreparationMessage(order);

                const isScheduled =
                  order.orderStatus === "scheduled";

                return (
                  <tr key={order._id}>
                    <td>
                      <div className="owner-order-id">
                        <strong>
                          {getOrderShortId(order)}
                        </strong>

                        {isScheduled && (
                          <span className="scheduled-order-badge">
                            Pre-order
                          </span>
                        )}
                      </div>

                      <span className="order-created-time">
                        Ordered:{" "}
                        {formatISTDateTime(order.createdAt)}
                      </span>
                    </td>

                    <td>
                      <div className="owner-customer-details">
                        <strong>
                          {order.customer?.name ||
                            order.customerName ||
                            "Customer"}
                        </strong>

                        {order.customer?.phone && (
                          <span>
                            {order.customer.phone}
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="owner-order-items">
                        {(order.items || []).map(
                          (orderItem, index) => (
                            <span
                              key={
                                orderItem._id ||
                                `${getItemName(
                                  orderItem
                                )}-${index}`
                              }
                            >
                              {getItemName(orderItem)} ×{" "}
                              {orderItem.quantity || 1}
                            </span>
                          )
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="arrival-time-cell">
                        <strong>
                          {formatISTTime(order.arrivalTime)}
                        </strong>

                        <span>
                          {formatISTDateTime(
                            order.arrivalTime
                          )}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="kitchen-timing-cell">
                        <span>
                          Start:{" "}
                          <strong>
                            {formatISTTime(
                              order.kitchenStartTime
                            )}
                          </strong>
                        </span>

                        <span>
                          Ready by:{" "}
                          <strong>
                            {formatISTTime(
                              order.expectedReadyTime
                            )}
                          </strong>
                        </span>

                        <span
                          className={
                            preparationMessage.className
                          }
                        >
                          {preparationMessage.text}
                        </span>
                      </div>
                    </td>

                    <td>
                      <strong>
                        ₹{order.totalAmount || 0}
                      </strong>
                    </td>

                    <td>
                      <select
                        className="status-select"
                        value={order.orderStatus}
                        disabled={
                          updatingOrderId === order._id
                        }
                        onChange={(event) =>
                          handleStatusChange(
                            order._id,
                            event.target.value
                          )
                        }
                      >
                        {getStatusOptions(order.orderStatus).map(
  (status) => (
    <option
      value={status}
      key={status}
    >
      {status.replaceAll("_", " ")}
    </option>
  )
)}
                      </select>
                    </td>

                    <td>
                      <div className="owner-payment-details">
                        <span className="payment-pill">
                          {order.paymentStatus || "pending"}
                        </span>

                        <span>
                          {order.paymentMethod === "upi"
                            ? "UPI"
                            : "Cash"}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Orders;