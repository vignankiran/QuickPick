import { useEffect, useState } from "react";
import {
  useParams,
  useNavigate,
  Link,
} from "react-router-dom";
import {
  ArrowLeft,
  ShoppingCart,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { getAllShops } from "../../services/shopService";
import { getCategoriesByShop } from "../../services/categoryService";
import { addToCart } from "../../services/cartService";
import { getAvailableInventoryByShop } from "../../services/inventoryService";

import ShopTimingDisplay from "../../components/shop/ShopTimingDisplay";
import { getShopTimingStatus } from "../../utils/shopTiming";

const ShopMenu = () => {
  const { shopId } = useParams();
  const navigate = useNavigate();

  const { isAuthenticated, user } = useAuth();

  const [shop, setShop] = useState(null);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);

  const [loading, setLoading] = useState(true);
  const [addingItemId, setAddingItemId] = useState(null);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const timingStatus = getShopTimingStatus(shop);
  const canPlaceOrder = timingStatus.isOpen;

  const normalizeArray = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.shops)) return data.shops;
    if (Array.isArray(data?.categories)) return data.categories;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.inventory)) return data.inventory;

    if (Array.isArray(data?.data?.shops)) {
      return data.data.shops;
    }

    if (Array.isArray(data?.data?.categories)) {
      return data.data.categories;
    }

    if (Array.isArray(data?.data?.items)) {
      return data.data.items;
    }

    if (Array.isArray(data?.data?.inventory)) {
      return data.data.inventory;
    }

    return [];
  };

  useEffect(() => {
    if (
      isAuthenticated &&
      user?.role === "owner"
    ) {
      navigate("/owner/dashboard", {
        replace: true,
      });
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    const loadShopMenu = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          shopsResponse,
          categoriesResponse,
          inventoryResponse,
        ] = await Promise.all([
          getAllShops(),
          getCategoriesByShop(shopId),
          getAvailableInventoryByShop(shopId),
        ]);

        const shops = normalizeArray(shopsResponse);

        const selectedShop = shops.find(
          (singleShop) => singleShop._id === shopId
        );

        if (!selectedShop) {
          setShop(null);
          setError("Restaurant was not found.");
          return;
        }

        setShop(selectedShop);

        setCategories(
          normalizeArray(categoriesResponse)
        );

        const availableInventory =
          normalizeArray(inventoryResponse);

        const availableItems = availableInventory
          .map((record) => {
            if (!record?.item) {
              return null;
            }

            return {
              ...record.item,
              inventoryId: record._id,
              remainingQuantity:
                record.remainingQuantity,
              inventoryStatus: record.status,
            };
          })
          .filter(
            (item) =>
              item &&
              item._id &&
              item.isAvailable !== false &&
              Number(item.remainingQuantity || 0) > 0
          );

        setItems(availableItems);
      } catch (error) {
        setError(
          error.response?.data?.message ||
            "Failed to load menu. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    loadShopMenu();
  }, [shopId]);

  const getCategoryId = (item) => {
    if (typeof item.category === "object") {
      return (
        item.category?._id ||
        item.category?.id
      );
    }

    return item.category;
  };

  const getItemsByCategory = (categoryId) => {
    return items.filter(
      (item) =>
        getCategoryId(item) === categoryId
    );
  };

  const handleAddToCart = async (itemId) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (user?.role !== "customer") {
      alert(
        "Only customers can add items to the cart."
      );
      return;
    }

    if (!canPlaceOrder) {
      alert(
        timingStatus.message ||
          "This restaurant is currently closed."
      );
      return;
    }

    try {
      setAddingItemId(itemId);
      setSuccessMessage("");

      await addToCart({
        shop: shopId,
        item: itemId,
        quantity: 1,
      });

      setSuccessMessage(
        "Item added to cart successfully."
      );
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to add item to cart. Please try again."
      );
    } finally {
      setAddingItemId(null);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        Loading menu...
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <h2>Menu not available</h2>
        <p>{error}</p>

        <Link to="/" className="primary-link-btn">
          Back to Restaurants
        </Link>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="empty-state">
        <h2>Restaurant not found</h2>
        <p>
          This restaurant may no longer be available.
        </p>

        <Link to="/" className="primary-link-btn">
          Back to Restaurants
        </Link>
      </div>
    );
  }

  return (
    <div className="shop-menu-page">
      <Link to="/" className="back-link">
        <ArrowLeft size={18} />
        Back to restaurants
      </Link>

      <div className="shop-menu-header">
        <div>
          <span className="hero-badge">
            Restaurant Menu
          </span>

          <h1>{shop.name || "Restaurant"}</h1>

          <p>
            {shop.address ||
              shop.location ||
              "Location not added"}
          </p>

          <ShopTimingDisplay shop={shop} />
        </div>
      </div>

      {!canPlaceOrder && (
        <div className="cart-shop-closed-message">
          <strong>{timingStatus.label}</strong>

          <span>
            {timingStatus.message ||
              "This restaurant is currently not accepting orders."}
          </span>
        </div>
      )}

      {successMessage && (
        <div className="success-message success-row">
          <span>{successMessage}</span>

          <Link to="/cart">
            View Cart
          </Link>
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty-state">
          <h2>No items available</h2>

          <p>
            This restaurant has no available items
            in today&apos;s inventory.
          </p>
        </div>
      ) : (
        <div className="menu-sections">
          {categories.map((category) => {
            const categoryItems =
              getItemsByCategory(category._id);

            if (categoryItems.length === 0) {
              return null;
            }

            return (
              <section
                className="menu-section"
                key={category._id}
              >
                <div className="section-header">
                  <div>
                    <h2>{category.name}</h2>

                    <p>
                      {categoryItems.length} item
                      {categoryItems.length !== 1
                        ? "s"
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="menu-grid">
                  {categoryItems.map((item) => {
                    const isAdding =
                      addingItemId === item._id;

                    const hasStock =
                      Number(
                        item.remainingQuantity || 0
                      ) > 0;

                    const itemCanBeAdded =
                      item.isAvailable !== false &&
                      hasStock &&
                      canPlaceOrder;

                    let buttonText = "Add";

                    if (isAdding) {
                      buttonText = "Adding...";
                    } else if (!canPlaceOrder) {
                      buttonText = "Shop Closed";
                    } else if (!hasStock) {
                      buttonText = "Sold Out";
                    } else if (
                      item.isAvailable === false
                    ) {
                      buttonText = "Unavailable";
                    }

                    return (
                      <div
                        className="menu-card"
                        key={item._id}
                      >
                        <div>
                          <h3>{item.name}</h3>

                          <p>
                            {item.description ||
                              "No description added"}
                          </p>

                          <p className="muted-text">
                            Available today:{" "}
                            {item.remainingQuantity}
                          </p>

                          <span
                            className={
                              item.isAvailable !==
                                false && hasStock
                                ? "status-badge available"
                                : "status-badge sold_out"
                            }
                          >
                            {item.isAvailable !==
                              false && hasStock
                              ? "Available"
                              : "Unavailable"}
                          </span>
                        </div>

                        <div className="menu-card-footer">
                          <strong>
                            ₹{item.price}
                          </strong>

                          <button
                            className="primary-btn"
                            disabled={
                              !itemCanBeAdded ||
                              isAdding
                            }
                            onClick={() =>
                              handleAddToCart(
                                item._id
                              )
                            }
                          >
                            <ShoppingCart
                              size={16}
                            />

                            {buttonText}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ShopMenu;