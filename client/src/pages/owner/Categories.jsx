import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getAllShops } from "../../services/shopService";
import {
  getCategoriesByShop,
  createCategory,
  deleteCategory,
} from "../../services/categoryService";

const Categories = () => {
  const { user } = useAuth();

  const [shop, setShop] = useState(null);
  const [categories, setCategories] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    displayOrder: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const getUserId = () => user?._id || user?.id;

  const normalizeArray = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.shops)) return data.shops;
    if (Array.isArray(data?.categories)) return data.categories;
    if (Array.isArray(data?.data?.shops)) return data.data.shops;
    if (Array.isArray(data?.data?.categories)) return data.data.categories;
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

  const loadCategoriesPage = async () => {
    try {
      setLoading(true);
      setError("");

      const ownerShop = await findOwnerShop();
      const categoriesResponse = await getCategoriesByShop(ownerShop._id);

      setCategories(normalizeArray(categoriesResponse));
    } catch (error) {
      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to load categories."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadCategoriesPage();
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;

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
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Category name is required.");
      return;
    }

    if (!formData.slug.trim()) {
      alert("Category slug is required.");
      return;
    }

    try {
      setSaving(true);

      await createCategory({
        shop: shop._id,
        name: formData.name,
        slug: formData.slug,
        displayOrder: Number(formData.displayOrder || 0),
      });

      setFormData({
        name: "",
        slug: "",
        displayOrder: 0,
      });

      await loadCategoriesPage();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to create category. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async (categoryId) => {
    const confirmDelete = window.confirm(
        "Are you sure you want to delete this category?"
    );

    if (!confirmDelete) return;

    try {
        await deleteCategory(categoryId);

        setCategories((prev) =>
        prev.filter((category) => category._id !== categoryId)
        );
    } catch (error) {
        alert(
        error.response?.data?.message ||
            "Failed to delete category. Please try again."
        );
    }
    };
  if (loading) {
    return <div className="page-loading">Loading categories...</div>;
  }

  if (error) {
    return (
      <div className="empty-state">
        <h2>Categories not available</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="categories-page">
      <div className="page-header">
        <div>
          <h1>Categories</h1>
          <p>
            {shop?.name
              ? `Manage menu categories for ${shop.name}`
              : "Manage menu categories"}
          </p>
        </div>
      </div>

      <div className="inventory-layout">
        <div className="dashboard-section">
          <h2>Add Category</h2>
          <p className="muted-text">
            Create categories like Biryani, Tiffins, Meals, Drinks.
          </p>

          <form className="inventory-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Category Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Example: Biryani"
              />
            </div>

            <div className="form-group">
              <label>Slug</label>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                placeholder="Example: biryani"
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

            <button className="primary-btn" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Create Category"}
            </button>
          </form>
        </div>

        <div className="dashboard-section">
          <h2>Category List</h2>

          {categories.length === 0 ? (
            <p className="muted-text">
              No categories yet. Create your first category.
            </p>
          ) : (
            <div className="inventory-list">
              {categories.map((category) => (
                <div className="inventory-card" key={category._id}>
                    <div>
                        <h3>{category.name}</h3>
                        <p>Slug: {category.slug}</p>
                        <span className="status-badge available">
                        Order: {category.displayOrder || 0}
                        </span>
                    </div>

                    <button
                        className="danger-btn"
                        onClick={() => handleDelete(category._id)}
                    >
                        Delete
                    </button>
                    </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Categories;