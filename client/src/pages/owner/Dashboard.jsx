import { useEffect, useState } from "react";
import {
  IndianRupee,
  ShoppingBag,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { getAllShops } from "../../services/shopService";
import { getOwnerDashboard } from "../../services/dashboardService";

const Dashboard = () => {
  const { user } = useAuth();

  const [shop, setShop] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getUserId = () => user?._id || user?.id;

  const normalizeArray = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.shops)) return data.shops;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.data?.shops)) return data.data.shops;
    return [];
  };

  const normalizeDashboard = (data) => {
    return data?.data || data?.dashboard || data?.summary || data || {};
  };

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        let shopId = null;

        if (user?.shop) {
          shopId = typeof user.shop === "object" ? user.shop._id : user.shop;
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

        const dashboardResponse = await getOwnerDashboard(shopId);
        setDashboard(normalizeDashboard(dashboardResponse));
      } catch (error) {
        setError(
          error.response?.data?.message ||
            "Failed to load dashboard. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadDashboard();
    }
  }, [user]);

  const statusCounts = dashboard?.statusCounts || {};

  const activeOrders =
    (statusCounts.placed || 0) +
    (statusCounts.confirmed || 0) +
    (statusCounts.scheduled || 0) +
    (statusCounts.preparing || 0) +
    (statusCounts.ready || 0) +
    (statusCounts.customer_arrived || 0) +
    (statusCounts.handed_over || 0);

  if (loading) {
    return <div className="page-loading">Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div className="empty-state">
        <h2>Dashboard not available</h2>
        <p>{error}</p>
        <p className="muted-text">
          We will add shop creation/selection soon if your owner account does
          not have a shop yet.
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>
            {shop?.name
              ? `Overview for ${shop.name}`
              : "Today’s business overview"}
          </p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <IndianRupee size={22} />
          </div>
          <div>
            <p>Today Revenue</p>
            <h2>₹{dashboard?.todayRevenue || 0}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <ShoppingBag size={22} />
          </div>
          <div>
            <p>Total Orders</p>
            <h2>{dashboard?.totalOrders || 0}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Clock size={22} />
          </div>
          <div>
            <p>Active Orders</p>
            <h2>{activeOrders}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <CheckCircle size={22} />
          </div>
          <div>
            <p>Completed</p>
            <h2>{statusCounts.completed || 0}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon warning">
            <AlertTriangle size={22} />
          </div>
          <div>
            <p>Low Stock</p>
            <h2>{dashboard?.lowStockCount || 0}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon danger">
            <XCircle size={22} />
          </div>
          <div>
            <p>Sold Out</p>
            <h2>{dashboard?.soldOutCount || 0}</h2>
          </div>
        </div>
      </div>

      <div className="dashboard-section">
        <h2>Order Status</h2>
        <p className="muted-text">Live summary of today’s order flow.</p>

        <div className="status-grid">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div className="status-card" key={status}>
              <p>{status.replaceAll("_", " ")}</p>
              <h3>{count}</h3>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-section">
        <h2>Inventory Alerts</h2>

        {dashboard?.lowStockItems?.length === 0 &&
        dashboard?.soldOutItems?.length === 0 ? (
          <p className="muted-text">No low stock or sold out items today.</p>
        ) : (
          <div className="alert-list">
            {dashboard?.lowStockItems?.map((item) => (
              <div className="alert-item" key={item._id}>
                <span>{item.item?.name || "Item"}</span>
                <strong>Low Stock</strong>
              </div>
            ))}

            {dashboard?.soldOutItems?.map((item) => (
              <div className="alert-item" key={item._id}>
                <span>{item.item?.name || "Item"}</span>
                <strong>Sold Out</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;