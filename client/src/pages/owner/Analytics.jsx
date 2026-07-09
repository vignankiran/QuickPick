import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getAllShops } from "../../services/shopService";
import {
  getPeakHours,
  getTopCustomers,
  getRevenueReport,
  getItemPerformance,
  getWasteAnalysis,
} from "../../services/analyticsService";

const Analytics = () => {
  const { user } = useAuth();

  const [shop, setShop] = useState(null);
  const [analytics, setAnalytics] = useState({
    peakHours: [],
    topCustomers: [],
    revenueReport: [],
    itemPerformance: [],
    wasteAnalysis: [],
    });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getUserId = () => user?._id || user?.id;

  const normalizeArray = (data) => {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.analytics)) return data.analytics;

  if (Array.isArray(data?.peakHours)) return data.peakHours;
  if (Array.isArray(data?.topCustomers)) return data.topCustomers;
  if (Array.isArray(data?.itemPerformance)) return data.itemPerformance;
  if (Array.isArray(data?.wasteAnalysis)) return data.wasteAnalysis;

  // ✅ Add these for revenue report
  if (Array.isArray(data?.revenueReport)) return data.revenueReport;
  if (Array.isArray(data?.report)) return data.report;
  if (Array.isArray(data?.data?.revenueReport)) return data.data.revenueReport;
  if (Array.isArray(data?.data?.report)) return data.data.report;

  if (Array.isArray(data?.shops)) return data.shops;
  if (Array.isArray(data?.data?.shops)) return data.data.shops;

  return [];
};

  const normalizeObject = (data) => {
    return data?.data || data?.report || data?.revenueReport || data || {};
  };

  const findOwnerShop = async () => {
    if (user?.shop) {
      const userShop =
        typeof user.shop === "object" ? user.shop : { _id: user.shop };

      setShop(userShop);
      return userShop;
    }

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
      throw new Error("No shop found for this owner account.");
    }

    setShop(ownerShop);
    return ownerShop;
  };

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError("");

        const ownerShop = await findOwnerShop();

        const [
          peakHoursResponse,
          topCustomersResponse,
          revenueReportResponse,
          itemPerformanceResponse,
          wasteAnalysisResponse,
        ] = await Promise.all([
          getPeakHours(ownerShop._id),
          getTopCustomers(ownerShop._id),
          getRevenueReport(ownerShop._id),
          getItemPerformance(ownerShop._id),
          getWasteAnalysis(ownerShop._id),
        ]);

        setAnalytics({
          peakHours: normalizeArray(peakHoursResponse),
          topCustomers: normalizeArray(topCustomersResponse),
          revenueReport: normalizeArray(revenueReportResponse),          itemPerformance: normalizeArray(itemPerformanceResponse),
          wasteAnalysis: normalizeArray(wasteAnalysisResponse),
        });
      } catch (error) {
        setError(
          error.response?.data?.message ||
            error.message ||
            "Failed to load analytics."
        );
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadAnalytics();
    }
  }, [user]);

  const formatLabel = (key) => {
    return key.replaceAll("_", " ").replaceAll("-", " ");
  };

  const renderObjectValue = (value) => {
    if (value === null || value === undefined) return "N/A";

    if (typeof value === "object") {
      return value.name || value.itemName || value.customerName || JSON.stringify(value);
    }

    return value;
  };

  const renderDataList = (data, emptyMessage) => {
    if (!data || data.length === 0) {
      return <p className="muted-text">{emptyMessage}</p>;
    }

    return (
      <div className="analytics-list">
        {data.map((item, index) => (
          <div className="analytics-row" key={item._id || index}>
            {Object.entries(item).map(([key, value]) => {
              if (key === "_id" || key === "__v") return null;

              return (
                <div key={key}>
                  <span>{formatLabel(key)}</span>
                  <strong>{renderObjectValue(value)}</strong>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="page-loading">Loading analytics...</div>;
  }

  if (error) {
    return (
      <div className="empty-state">
        <h2>Analytics not available</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p>
            {shop?.name
              ? `Business analytics for ${shop.name}`
              : "Business analytics overview"}
          </p>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="dashboard-section">
            <h2>Revenue Report</h2>
            <p className="muted-text">Daily revenue and order summary.</p>

            {analytics.revenueReport.length === 0 ? (
                <p className="muted-text">No revenue report available yet.</p>
            ) : (
                <div className="revenue-grid">
                {analytics.revenueReport.map((report) => (
                    <div className="revenue-card" key={report._id}>
                    <p>Date</p>
                    <h3>{report._id}</h3>

                    <p>Revenue</p>
                    <h3>₹{report.totalRevenue || 0}</h3>

                    <p>Orders</p>
                    <h3>{report.totalOrders || 0}</h3>
                    </div>
                ))}
                </div>
            )}
            </div>

        <div className="dashboard-section">
          <h2>Peak Hours</h2>
          {renderDataList(
            analytics.peakHours,
            "No peak hour data available yet."
          )}
        </div>

        <div className="dashboard-section">
          <h2>Top Customers</h2>
          {renderDataList(
            analytics.topCustomers,
            "No top customer data available yet."
          )}
        </div>

        <div className="dashboard-section">
          <h2>Item Performance</h2>
          {renderDataList(
            analytics.itemPerformance,
            "No item performance data available yet."
          )}
        </div>

        <div className="dashboard-section">
          <h2>Waste Analysis</h2>
          {renderDataList(
            analytics.wasteAnalysis,
            "No waste analysis data available yet."
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;