import { useEffect, useState } from "react";
import { PackageCheck, Clock, XCircle } from "lucide-react";

import { getMyOrders, cancelOrder } from "../../services/orderService";
import { useAuth } from "../../context/AuthContext";

const MyOrders = () => {
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("today");
  const [loading, setLoading] = useState(true);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [error, setError] = useState("");

  const normalizeArray = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.orders)) return data.orders;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.data?.orders)) return data.data.orders;
    return [];
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getMyOrders();
      setOrders(normalizeArray(response));
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to load your orders. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const handleCancelOrder = async (orderId) => {
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this order?"
    );

    if (!confirmCancel) return;

    try {
      setCancellingOrderId(orderId);

      await cancelOrder(orderId);
      await loadOrders();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to cancel order. Please try again."
      );
    } finally {
      setCancellingOrderId(null);
    }
  };

  const canCancel = (status) => {
    return ["placed", "confirmed", "scheduled"].includes(status);
  };
    const getISTDate = (dateValue) => {
        return new Date(dateValue).toLocaleDateString("en-CA", {
            timeZone: "Asia/Kolkata",
        });
        };

        const todayIST = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
        });

        const sortedOrders = [...orders].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        const todayOrders = sortedOrders.filter(
        (order) => getISTDate(order.createdAt) === todayIST
        );

        const historyOrders = sortedOrders.filter(
        (order) => getISTDate(order.createdAt) !== todayIST
        );

        const displayedOrders =
        activeTab === "today" ? todayOrders : historyOrders;
  if (loading) {
    return <div className="page-loading">Loading your orders...</div>;
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
    <div className="my-orders-page">
      <div className="page-header">
        <div>
          <h1>My Orders</h1>
          <p>Track your QuickPick food orders.</p>
        </div>
      </div>
        <div className="filter-tabs">
            <button
                className={activeTab === "today" ? "filter-tab active" : "filter-tab"}
                onClick={() => setActiveTab("today")}
            >
                Today / Latest ({todayOrders.length})
            </button>

            <button
                className={activeTab === "history" ? "filter-tab active" : "filter-tab"}
                onClick={() => setActiveTab("history")}
            >
                Order History ({historyOrders.length})
            </button>
        </div>
      {displayedOrders.length === 0 ? (
        <div className="empty-state">
          <h2>No orders yet</h2>
          <p>Your placed orders will appear here.</p>
        </div>
      ) : (
        <div className="customer-orders-list">
          {displayedOrders.map((order) => (
            <div className="customer-order-card" key={order._id}>
              <div className="order-card-top">
                <div>
                  <h3>{order.orderNumber || "Order"}</h3>
                  <p>
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleString()
                      : ""}
                  </p>
                </div>

                <span className={`order-status ${order.orderStatus}`}>
                  {order.orderStatus?.replaceAll("_", " ")}
                </span>
              </div>

              <div className="order-shop-row">
                <PackageCheck size={18} />
                <span>{order.shop?.name || "Restaurant"}</span>
              </div>

              <div className="order-items">
                {order.items?.map((orderItem, index) => (
                  <div className="order-item-row" key={index}>
                    <span>
                      {orderItem.item?.name || orderItem.name || "Item"} ×{" "}
                      {orderItem.quantity}
                    </span>
                    <strong>
                      ₹
                      {orderItem.subtotal ||
                        orderItem.price * orderItem.quantity ||
                        0}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="order-footer">
                <div>
                  <p>Total Amount</p>
                  <h2>₹{order.totalAmount || 0}</h2>
                </div>

                <div>
                  <p>Payment</p>
                  <h2>{order.paymentStatus || "pending"} </h2>
                </div>

                {order.arrivalTime && (
                  <div>
                    <p>Arrival Time</p>
                    <h2>
                      <Clock size={16} />{" "}
                      {new Date(order.arrivalTime).toLocaleString()}
                    </h2>
                  </div>
                )}

                {canCancel(order.orderStatus) && (
                  <button
                    className="danger-btn"
                    disabled={cancellingOrderId === order._id}
                    onClick={() => handleCancelOrder(order._id)}
                  >
                    <XCircle size={16} />
                    {cancellingOrderId === order._id
                      ? "Cancelling..."
                      : "Cancel"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrders;