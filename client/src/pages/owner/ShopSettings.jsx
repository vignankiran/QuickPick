import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getAllShops,
  updateShopDetails,
  temporaryCloseShop,
  reopenShop,
} from "../../services/shopService";

const ShopSettings = () => {
  const { user } = useAuth();

  const [shop, setShop] = useState(null);
  const [closedUntil, setClosedUntil] = useState("");
  const [reason, setReason] = useState("");
  const [shopForm, setShopForm] = useState({
  name: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "Andhra Pradesh",
  pincode: "",
  openingTime: "06:00",
  closingTime: "22:00",
  acceptsPreOrders: true,
  maxOrdersPerSlot: 10,
});

const [updatingDetails, setUpdatingDetails] = useState(false);
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
  const fillShopForm = (shopData) => {
    setShopForm({
      name: shopData?.name || "",
      phone: shopData?.phone || "",
      email: shopData?.email || "",
      address: shopData?.address || "",
      city: shopData?.city || "",
      state: shopData?.state || "Andhra Pradesh",
      pincode: shopData?.pincode || "",
      openingTime: shopData?.openingTime || "06:00",
      closingTime: shopData?.closingTime || "22:00",
      acceptsPreOrders: shopData?.acceptsPreOrders ?? true,
      maxOrdersPerSlot: shopData?.maxOrdersPerSlot || 10,
    });
  };

  const loadShop = async () => {
  try {
    setLoading(true);
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

      return singleShop._id === userShopId || ownerId === getUserId();
    });

    if (!ownerShop) {
      setError("No shop found for this owner account.");
      return;
    }

    setShop(ownerShop);
    fillShopForm(ownerShop);
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
  const handleShopFormChange = (e) => {
  const { name, value, type, checked } = e.target;

  setShopForm((previous) => ({
    ...previous,
    [name]: type === "checkbox" ? checked : value,
  }));
};

const handleUpdateShop = async (e) => {
  e.preventDefault();

  if (
    !shopForm.name.trim() ||
    !shopForm.phone.trim() ||
    !shopForm.address.trim() ||
    !shopForm.city.trim()
  ) {
    alert("Name, phone, address, and city are required.");
    return;
  }

  const maximumOrders = Number(shopForm.maxOrdersPerSlot);

  if (!Number.isInteger(maximumOrders) || maximumOrders < 1) {
    alert("Maximum orders per slot must be at least 1.");
    return;
  }

  try {
    setUpdatingDetails(true);

    const response = await updateShopDetails(shop._id, {
      ...shopForm,
      maxOrdersPerSlot: maximumOrders,
    });

    const updatedShop =
      response.shop || response.data?.shop || shop;

    setShop(updatedShop);
    fillShopForm(updatedShop);

    alert("Shop details updated successfully.");
  } catch (error) {
    alert(
      error.response?.data?.message ||
        "Failed to update shop details."
    );
  } finally {
    setUpdatingDetails(false);
  }
};

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
                  <div className="dashboard-section shop-details-section">
  <h2>Shop Details</h2>

  <p className="muted-text">
    Update the public contact details, location, timings, and ordering settings.
    The owner and shop slug cannot be changed here.
  </p>

  <form className="shop-settings-form" onSubmit={handleUpdateShop}>
    <div className="shop-details-grid">
      <div className="form-group">
        <label>Shop Name</label>
        <input
          type="text"
          name="name"
          value={shopForm.name}
          onChange={handleShopFormChange}
          placeholder="Enter shop name"
        />
      </div>

      <div className="form-group">
        <label>Shop Phone</label>
        <input
          type="tel"
          name="phone"
          value={shopForm.phone}
          onChange={handleShopFormChange}
          placeholder="Enter shop contact number"
        />
      </div>

      <div className="form-group">
        <label>Email</label>
        <input
          type="email"
          name="email"
          value={shopForm.email}
          onChange={handleShopFormChange}
          placeholder="Enter shop email"
        />
      </div>

      <div className="form-group">
        <label>Pincode</label>
        <input
          type="text"
          name="pincode"
          value={shopForm.pincode}
          onChange={handleShopFormChange}
          placeholder="Enter pincode"
        />
      </div>

      <div className="form-group full-width">
        <label>Address</label>
        <input
          type="text"
          name="address"
          value={shopForm.address}
          onChange={handleShopFormChange}
          placeholder="Enter complete shop address"
        />
      </div>

      <div className="form-group">
        <label>City</label>
        <input
          type="text"
          name="city"
          value={shopForm.city}
          onChange={handleShopFormChange}
          placeholder="Enter city"
        />
      </div>

      <div className="form-group">
        <label>State</label>
        <input
          type="text"
          name="state"
          value={shopForm.state}
          onChange={handleShopFormChange}
          placeholder="Enter state"
        />
      </div>

      <div className="form-group">
        <label>Opening Time</label>
        <input
          type="time"
          name="openingTime"
          value={shopForm.openingTime}
          onChange={handleShopFormChange}
        />
      </div>

      <div className="form-group">
        <label>Closing Time</label>
        <input
          type="time"
          name="closingTime"
          value={shopForm.closingTime}
          onChange={handleShopFormChange}
        />
      </div>

      <div className="form-group">
        <label>Maximum Orders Per Slot</label>
        <input
          type="number"
          name="maxOrdersPerSlot"
          min="1"
          value={shopForm.maxOrdersPerSlot}
          onChange={handleShopFormChange}
        />
      </div>

      <div className="checkbox-row shop-preorder-setting">
        <input
          type="checkbox"
          name="acceptsPreOrders"
          checked={shopForm.acceptsPreOrders}
          onChange={handleShopFormChange}
        />

        <label>Accept customer pre-orders</label>
      </div>
    </div>

    <button
      className="primary-btn"
      type="submit"
      disabled={updatingDetails}
    >
      {updatingDetails ? "Updating..." : "Update Shop Details"}
    </button>
  </form>
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