import { useEffect, useState } from "react";
import { getAllShops } from "../../services/shopService";
import { getItemsByShop } from "../../services/itemService";
import {
  getInventoryByShop,
  createOrUpdateInventory,
  deleteInventory,
  carryForwardInventory,
} from "../../services/inventoryService";
import { useAuth } from "../../context/AuthContext";

const Inventory = () => {
  const { user } = useAuth();

  const [shop, setShop] = useState(null);
  const [items, setItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [activeTab, setActiveTab] = useState("today");

  const [formData, setFormData] = useState({
    item: "",
    preparedQuantity: "",
    soldQuantity: "",
    wastedQuantity: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [carryingForward, setCarryingForward] = useState(false);
  const [editingInventoryId, setEditingInventoryId] = useState(null);
  const [error, setError] = useState("");

  const getUserId = () => user?._id || user?.id;

  const normalizeArray = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.shops)) return data.shops;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.inventory)) return data.inventory;
    if (Array.isArray(data?.data?.shops)) return data.data.shops;
    if (Array.isArray(data?.data?.items)) return data.data.items;
    if (Array.isArray(data?.data?.inventory)) return data.data.inventory;
    return [];
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

  const loadInventoryPage = async () => {
    try {
      setLoading(true);
      setError("");

      const ownerShop = await findOwnerShop();

      const itemsResponse = await getItemsByShop(ownerShop._id);
      const inventoryResponse = await getInventoryByShop(ownerShop._id);

      setItems(normalizeArray(itemsResponse));
      setInventory(normalizeArray(inventoryResponse));
    } catch (error) {
      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to load inventory."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadInventoryPage();
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const getStatus = (remainingQuantity) => {
    if (remainingQuantity <= 0) return "sold_out";
    if (remainingQuantity <= 5) return "low_stock";
    return "available";
  };
  const handleCarryForward = async () => {
      const confirmCarryForward = window.confirm(
        "Start today with yesterday's inventory? Existing today's items will not be overwritten."
      );

      if (!confirmCarryForward) return;

      try {
        setCarryingForward(true);

        const response = await carryForwardInventory(shop._id);

        alert(
          response.message ||
            "Inventory carried forward successfully."
        );

        await loadInventoryPage();
      } catch (error) {
        alert(
          error.response?.data?.message ||
            "Failed to carry forward inventory."
        );
      } finally {
        setCarryingForward(false);
      }
    };
  const handleEdit = (record) => {
      const itemId =
        typeof record.item === "object"
          ? record.item?._id || record.item?.id
          : record.item;

      setEditingInventoryId(record._id);

      setFormData({
        item: itemId,
        preparedQuantity: record.preparedQuantity || "",
        soldQuantity: record.soldQuantity || 0,
        wastedQuantity: record.wastedQuantity || 0,
      });

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    };

    const handleCancelEdit = () => {
      setEditingInventoryId(null);

      setFormData({
        item: "",
        preparedQuantity: "",
        soldQuantity: "",
        wastedQuantity: "",
      });
    };
    const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.item) {
      alert("Please select an item.");
      return;
    }

    const preparedQuantity = Number(formData.preparedQuantity);
    const soldQuantity = Number(formData.soldQuantity || 0);
    const wastedQuantity = Number(formData.wastedQuantity || 0);

    if (preparedQuantity < 0 || soldQuantity < 0 || wastedQuantity < 0) {
      alert("Quantities cannot be negative.");
      return;
    }

    if (soldQuantity + wastedQuantity > preparedQuantity) {
      alert("Sold + wasted quantity cannot be greater than prepared quantity.");
      return;
    }

    const remainingQuantity =
      preparedQuantity - soldQuantity - wastedQuantity;
    const todayDate = new Date().toLocaleDateString("en-CA", {
            timeZone: "Asia/Kolkata",
            });
    try {
      setSaving(true);

      

        await createOrUpdateInventory({
        shop: shop._id,
        item: formData.item,
        date: todayDate,
        preparedQuantity,
        soldQuantity,
        wastedQuantity,
        remainingQuantity,
        status: getStatus(remainingQuantity),
        });

      setFormData({
        item: "",
        preparedQuantity: "",
        soldQuantity: "",
        wastedQuantity: "",
      });
      setEditingInventoryId(null);

      await loadInventoryPage();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to save inventory. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (inventoryId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this inventory record?"
    );

    if (!confirmDelete) return;

    try {
      await deleteInventory(inventoryId);
      setInventory((prev) =>
        prev.filter((record) => record._id !== inventoryId)
      );
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to delete inventory. Please try again."
      );
    }
  };
  const getInventoryDate = (dateValue) => {
    if (!dateValue) return "";

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }

    return new Date(dateValue).toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
  };

  const todayIST = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

  const sortedInventory = [...inventory].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const todayInventory = sortedInventory.filter(
    (record) => getInventoryDate(record.date) === todayIST
  );

  const inventoryHistory = sortedInventory.filter(
    (record) => getInventoryDate(record.date) !== todayIST
  );

  const displayedInventory =
    activeTab === "today" ? todayInventory : inventoryHistory;
  if (loading) {
    return <div className="page-loading">Loading inventory...</div>;
  }

  if (error) {
    return (
      <div className="empty-state">
        <h2>Inventory not available</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="inventory-page">
      <div className="page-header page-header-row">
        <div>
          <h1>Inventory</h1>
          <p>
            {shop?.name
              ? `Manage today's food stock for ${shop.name}`
              : "Manage today's food stock"}
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={handleCarryForward}
          disabled={carryingForward}
        >
          {carryingForward
            ? "Starting..."
            : "Start Today with Yesterday's Inventory"}
        </button>
      </div>

      <div className="inventory-layout">
        <div className="dashboard-section">
          <h2>{editingInventoryId ? "Edit Inventory" : "Add / Update Inventory"}</h2>          <p className="muted-text">
            Select an item and enter today’s prepared, sold, and wasted quantity.
          </p>

          <form className="inventory-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Item</label>
              <select
                  name="item"
                  value={formData.item}
                  onChange={handleChange}
                  disabled={!!editingInventoryId}
                >
                <option value="">Select item</option>
                {items.map((item) => (
                  <option value={item._id} key={item._id}>
                    {item.name} — ₹{item.price}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Prepared Quantity</label>
              <input
                type="number"
                name="preparedQuantity"
                value={formData.preparedQuantity}
                onChange={handleChange}
                placeholder="Example: 50"
                min="0"
              />
            </div>

            <div className="form-group">
              <label>Sold Quantity</label>
              <input
                type="number"
                name="soldQuantity"
                value={formData.soldQuantity}
                onChange={handleChange}
                placeholder="Example: 10"
                min="0"
              />
            </div>

            <div className="form-group">
              <label>Wasted Quantity</label>
              <input
                type="number"
                name="wastedQuantity"
                value={formData.wastedQuantity}
                onChange={handleChange}
                placeholder="Example: 2"
                min="0"
              />
            </div>

            <div className="form-actions">
              <button className="primary-btn" type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingInventoryId
                  ? "Update Inventory"
                  : "Save Inventory"}
              </button>

              {editingInventoryId && (
                <button
                  className="clear-cart-btn"
                  type="button"
                  onClick={handleCancelEdit}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="dashboard-section">
          <h2>
              {activeTab === "today" ? "Today’s Inventory" : "Inventory History"}
            </h2>

            <div className="filter-tabs">
              <button
                className={activeTab === "today" ? "filter-tab active" : "filter-tab"}
                onClick={() => setActiveTab("today")}
              >
                Today ({todayInventory.length})
              </button>

              <button
                className={activeTab === "history" ? "filter-tab active" : "filter-tab"}
                onClick={() => setActiveTab("history")}
              >
                History ({inventoryHistory.length})
              </button>
            </div>

          {displayedInventory.length === 0 ? (
            <p className="muted-text">
              No inventory records yet. Add inventory using the form.
            </p>
          ) : (
            <div className="inventory-list">
              {displayedInventory.map((record) => (
                <div className="inventory-card" key={record._id}>
                  <div>
                    <h3>{record.item?.name || "Item"}</h3>
                    <p>Date: {getInventoryDate(record.date)}</p>
                    <p>
                      Prepared: {record.preparedQuantity || 0} | Sold:{" "}
                      {record.soldQuantity || 0} | Remaining:{" "}
                      {record.remainingQuantity || 0}
                    </p>
                    <span className={`status-badge ${record.status}`}>
                      {record.status?.replaceAll("_", " ") || "available"}
                    </span>
                  </div>

                    {activeTab === "today" ? (
                  <div className="inventory-card-actions">
                    <button
                      className="primary-btn"
                      onClick={() => handleEdit(record)}
                    >
                      Edit
                    </button>

                    <button
                      className="danger-btn"
                      onClick={() => handleDelete(record._id)}
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <span className="history-readonly-badge">Read Only</span>
                )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Inventory;