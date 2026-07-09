import { useEffect, useState } from "react";
import { getAllShops } from "../../services/shopService";
import { getShopOrders, updateOrderStatus } from "../../services/orderService";
import { useAuth } from "../../context/AuthContext";

const orderStatuses = [
  "placed",
  "confirmed",
  "scheduled",
  "preparing",
  "ready",
  "customer_arrived",
  "handed_over",
  "completed",
  "cancelled",
  "rejected",
  "expired",
];

const Orders = () => {
  const { user } = useAuth();

  const [shop, setShop] = useState(null);
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [error, setError] = useState("");

  const getUserId = () => user?._id || user?.id;

  const normalizeArray = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.orders)) return data.orders;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.data?.orders)) return data.data.orders;
    if (Array.isArray(data?.shops)) return data.shops;
    if (Array.isArray(data?.data?.shops)) return data.data.shops;
    
    return [];
  };

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError("");

        let shopId = null;

        if (user?.shop) {
          shopId = typeof user.shop === "object" ? user.shop._id : user.shop;
          setShop(typeof user.shop === "object" ? user.shop : { _id: user.shop });
        }

        if (!shopId) {
          const shopResponse = await getAllShops();
          const shops = normalizeArray(shopResponse);

          const ownerShop = shops.find((singleShop) => {
            const ownerId =
              typeof singleShop.owner === "object"
                ? singleShop.owner?._id || singleShop.owner?.id
                : singleShop.owner;

            return ownerId === getUserId();
          });

          if (!ownerShop) {
            setError("No shop found for this owner account.");
            return;
          }

          setShop(ownerShop);
          shopId = ownerShop._id;
        }

        const ordersResponse = await getShopOrders(shopId);
        setOrders(normalizeArray(ordersResponse));
      } catch (error) {
        setError(
          error.response?.data?.message ||
            "Failed to load orders. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadOrders();
    }
  }, [user]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      setUpdatingOrderId(orderId);

      await updateOrderStatus(orderId, newStatus);

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
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
    return new Date(dateValue).toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
    });
    };

    const todayIST = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
    });

    const filteredOrders =
    filter === "today"
        ? orders.filter((order) => getISTDate(order.createdAt) === todayIST)
        : orders;

  if (loading) {
    return <div className="page-loading">Loading orders...</div>;
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
      </div>
       <div className="filter-tabs">
        <button
            className={filter === "all" ? "filter-tab active" : "filter-tab"}
            onClick={() => setFilter("all")}
        >
            All Orders ({orders.length})
        </button>

        <button
            className={filter === "today" ? "filter-tab active" : "filter-tab"}
            onClick={() => setFilter("today")}
        >
            Today ({orders.filter((order) => getISTDate(order.createdAt) === todayIST).length})
        </button>
        </div>         
      {filteredOrders.length === 0 ? (
        <div className="empty-state">
          <h2>No orders yet</h2>
          <p>Customer orders will appear here once they start ordering.</p>
        </div>
      ) : (
        <div className="table-card">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Payment</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order._id}>
                  <td>
                    <strong>{order.orderNumber || order._id}</strong>
                    <span>
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleString()
                        : ""}
                    </span>
                  </td>

                  <td>
                    {order.customer?.name ||
                      order.customerName ||
                      "Customer"}
                  </td>

                  <td>
                    {order.items?.length || 0} item
                    {(order.items?.length || 0) !== 1 ? "s" : ""}
                  </td>

                  <td>₹{order.totalAmount || 0}</td>

                  <td>
                    <select
                      className="status-select"
                      value={order.orderStatus}
                      disabled={updatingOrderId === order._id}
                      onChange={(e) =>
                        handleStatusChange(order._id, e.target.value)
                      }
                    >
                      {orderStatuses.map((status) => (
                        <option value={status} key={status}>
                          {status.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <span className="payment-pill">
                      {order.paymentStatus || "pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Orders;