import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getAllShops } from "../../services/shopService";
import { getCategoriesByShop } from "../../services/categoryService";
import {
  getItemsByShop,
  createItem,
  updateItem,
  deleteItem,
} from "../../services/itemService";


const Items = () => {
  const { user } = useAuth();

  const [shop, setShop] = useState(null);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    price: "",
    category: "",
    description: "",
    displayOrder: 0,
    isAvailable: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [error, setError] = useState("");

  const getUserId = () => user?._id || user?.id;

  const normalizeArray = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.shops)) return data.shops;
    if (Array.isArray(data?.categories)) return data.categories;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.data?.shops)) return data.data.shops;
    if (Array.isArray(data?.data?.categories)) return data.data.categories;
    if (Array.isArray(data?.data?.items)) return data.data.items;
    return [];
  };

  const generateSlug = (value) => {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
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

  const loadItemsPage = async () => {
    try {
      setLoading(true);
      setError("");

      const ownerShop = await findOwnerShop();

      const categoriesResponse = await getCategoriesByShop(ownerShop._id);
      const itemsResponse = await getItemsByShop(ownerShop._id);

      setCategories(normalizeArray(categoriesResponse));
      setItems(normalizeArray(itemsResponse));
    } catch (error) {
      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to load items."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadItemsPage();
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "name") {
      setFormData({
        ...formData,
        name: value,
        slug: generateSlug(value),
      });
      return;
    }

    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };
  const handleEdit = (item) => {
    const categoryId =
      typeof item.category === "object"
        ? item.category?._id || item.category?.id
        : item.category;

    setEditingItemId(item._id);

    setFormData({
      name: item.name || "",
      slug: item.slug || "",
      price: item.price || "",
      category: categoryId || "",
      description: item.description || "",
      displayOrder: item.displayOrder || 0,
      isAvailable: item.isAvailable ?? true,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);

    setFormData({
      name: "",
      slug: "",
      price: "",
      category: "",
      description: "",
      displayOrder: 0,
      isAvailable: true,
    });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Item name is required.");
      return;
    }

    if (!formData.slug.trim()) {
      alert("Item slug is required.");
      return;
    }

    if (!formData.category) {
      alert("Please select a category.");
      return;
    }

    if (!formData.price || Number(formData.price) <= 0) {
      alert("Price must be greater than 0.");
      return;
    }

    try {
      setSaving(true);

      const itemData = {
        category: formData.category,
        name: formData.name,
        price: Number(formData.price),
        description: formData.description,
        displayOrder: Number(formData.displayOrder || 0),
        isAvailable: formData.isAvailable,
      };

      if (editingItemId) {
        await updateItem(editingItemId, itemData);
      } else {
        await createItem({
          shop: shop._id,
          slug: formData.slug,
          ...itemData,
        });
      }

      setFormData({
        name: "",
        slug: "",
        price: "",
        category: "",
        description: "",
        displayOrder: 0,
        isAvailable: true,
      });
        setEditingItemId(null);
      await loadItemsPage();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to create item. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async (itemId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this item?"
    );

    if (!confirmDelete) return;

    try {
      await deleteItem(itemId);

      setItems((prevItems) =>
        prevItems.filter((item) => item._id !== itemId)
      );
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to delete item. Please try again."
      );
    }
  };
  const handleToggleAvailability = async (item) => {
    try {
      await updateItem(item._id, {
        isAvailable: !item.isAvailable,
      });

      setItems((prevItems) =>
        prevItems.map((singleItem) =>
          singleItem._id === item._id
            ? { ...singleItem, isAvailable: !singleItem.isAvailable }
            : singleItem
        )
      );
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to update item availability."
      );
    }
  };
  if (loading) {
    return <div className="page-loading">Loading items...</div>;
  }

  if (error) {
    return (
      <div className="empty-state">
        <h2>Items not available</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="items-page">
      <div className="page-header">
        <div>
          <h1>Items</h1>
          <p>
            {shop?.name
              ? `Manage food items for ${shop.name}`
              : "Manage food items"}
          </p>
        </div>
      </div>

      <div className="inventory-layout">
        <div className="dashboard-section">
          <h2>{editingItemId ? "Edit Item" : "Add Item"}</h2>          <p className="muted-text">
            Create menu items under categories like Starters, Biryani, Tiffins.
          </p>

          <form className="inventory-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Item Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Example: Chicken 65"
              />
            </div>

            <div className="form-group">
              <label>Slug</label>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                placeholder="Example: chicken-65"
                disabled={!!editingItemId}
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option value={category._id} key={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Price</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="Example: 180"
                min="1"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Short item description"
              />
            </div>

            <div className="form-group">
              <label>Display Order</label>
              <input
                type="number"
                name="displayOrder"
                value={formData.displayOrder}
                onChange={handleChange}
                min="0"
              />
            </div>

            <div className="checkbox-row">
              <input
                type="checkbox"
                name="isAvailable"
                checked={formData.isAvailable}
                onChange={handleChange}
              />
              <label>Available for ordering</label>
            </div>

            <div className="form-actions">
              <button className="primary-btn" type="submit" disabled={saving}>
            {saving
              ? "Saving..."
              : editingItemId
              ? "Update Item"
              : "Create Item"}
          </button>

          {editingItemId && (
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
          <h2>Item List</h2>

          {items.length === 0 ? (
            <p className="muted-text">
              No items yet. Create your first menu item.
            </p>
          ) : (
            <div className="inventory-list">
              {items.map((item) => (
                <div className="inventory-card" key={item._id}>
                  <div>
                    <h3>{item.name}</h3>
                    <p>
                      ₹{item.price} | Category:{" "}
                      {item.category?.name || "Category"}
                    </p>
                    <span
                      className={
                        item.isAvailable
                          ? "status-badge available"
                          : "status-badge sold_out"
                      }
                    >
                      {item.isAvailable ? "Available" : "Unavailable"}
                    </span>
                  </div>

                  <div className="inventory-card-actions">
                    <button
                      className="primary-btn"
                      onClick={() => handleEdit(item)}
                    >
                      Edit
                    </button>

                    <button
                      className="primary-btn"
                      onClick={() => handleToggleAvailability(item)}
                    >
                      {item.isAvailable ? "Mark Unavailable" : "Mark Available"}
                    </button>

                    <button
                      className="danger-btn"
                      onClick={() => handleDelete(item._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Items;