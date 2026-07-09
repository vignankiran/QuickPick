import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getAllShops,
  temporaryCloseShop,
  reopenShop,
} from "../../services/shopService";

const ShopSettings = () => {
  const { user } = useAuth();

  const [shop, setShop] = useState(null);
  const [closedUntil, setClosedUntil] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const getUserId = () => user?._id || user?.id;

  const normalizeArray = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.shops)) return data.shops;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.data?.shops)) return data.data.shops;
    return [];
  };

  const loadShop = async () => {
    try {
      setLoading(true);
      setError("");

      if (user?.shop && typeof user.shop === "object") {
        setShop(user.shop);
        return;
      }

      if (user?.shop) {
        setShop({ _id: user.shop });
        return;
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
        setError("No shop found for this owner account.");
        return;
      }

      setShop(ownerShop);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to load shop settings."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadShop();
    }
  }, [user]);

  const handleTemporaryClose = async (e) => {
    e.preventDefault();

    if (!closedUntil) {
      alert("Please select closed until time.");
      return;
    }

    try {
      setSaving(true);

      const response = await temporaryCloseShop(shop._id, {
        closedUntil,
        reason,
      });

      setShop(response.shop || response.data?.shop || shop);
      alert("Shop temporarily closed successfully.");

      setClosedUntil("");
      setReason("");
      await loadShop();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to temporarily close shop."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReopen = async () => {
    try {
      setSaving(true);

      await reopenShop(shop._id);
      alert("Shop reopened successfully.");

      await loadShop();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to reopen shop."
      );
    } finally {
      setSaving(false);
    }
  };

  const isTemporarilyClosed =
    shop?.temporaryClosedUntil &&
    new Date(shop.temporaryClosedUntil) > new Date();

  if (loading) {
    return <div className="page-loading">Loading shop settings...</div>;
  }

  if (error) {
    return (
      <div className="empty-state">
        <h2>Shop settings not available</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="shop-settings-page">
      <div className="page-header">
        <div>
          <h1>Shop Settings</h1>
          <p>
            {shop?.name
              ? `Manage availability for ${shop.name}`
              : "Manage shop availability"}
          </p>
        </div>
      </div>

      <div className="inventory-layout">
        <div className="dashboard-section">
          <h2>Current Status</h2>

          {isTemporarilyClosed ? (
            <>
              <p className="muted-text">Your shop is temporarily closed.</p>

              <div className="status-info-box">
                <p>
                  <strong>Reason:</strong>{" "}
                  {shop.temporaryCloseReason || "Temporarily closed"}
                </p>

                <p>
                  <strong>Closed Until:</strong>{" "}
                  {new Date(shop.temporaryClosedUntil).toLocaleString()}
                </p>
              </div>

              <button
                className="primary-btn"
                onClick={handleReopen}
                disabled={saving}
              >
                {saving ? "Reopening..." : "Reopen Now"}
              </button>
            </>
          ) : (
            <>
              <p className="muted-text">
                Your shop is currently open and visible to customers.
              </p>

              <span className="status-badge available">Open</span>
            </>
          )}
        </div>

        <div className="dashboard-section">
          <h2>Temporarily Close Shop</h2>
          <p className="muted-text">
            Use this when your shop is on break, out of stock, or not accepting
            orders for some time.
          </p>

          <form className="inventory-form" onSubmit={handleTemporaryClose}>
            <div className="form-group">
              <label>Closed Until</label>
              <input
                type="datetime-local"
                value={closedUntil}
                onChange={(e) => setClosedUntil(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Reason</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Example: Lunch break, stock over, maintenance"
              />
            </div>

            <button className="danger-btn" type="submit" disabled={saving}>
              {saving ? "Closing..." : "Temporarily Close Shop"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ShopSettings;