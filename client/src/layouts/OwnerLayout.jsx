import { useEffect, useState } from "react";
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { getAllShops } from "../services/shopService";

const OwnerLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [hasShop, setHasShop] = useState(false);
  const [checkingShop, setCheckingShop] = useState(true);
  const [shopError, setShopError] = useState("");

  const getUserId = () => user?._id || user?.id;

  const normalizeArray = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.shops)) return data.shops;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.data?.shops)) {
      return data.data.shops;
    }

    return [];
  };

  useEffect(() => {
    const checkOwnerShop = async () => {
      if (!user) return;

      try {
        setCheckingShop(true);
        setShopError("");

        const response = await getAllShops();
        const shops = normalizeArray(response);

        const userShopId =
          typeof user.shop === "object"
            ? user.shop?._id || user.shop?.id
            : user.shop;

        const ownerShop = shops.find((shop) => {
          const ownerId =
            typeof shop.owner === "object"
              ? shop.owner?._id || shop.owner?.id
              : shop.owner;

          return (
            shop._id === userShopId ||
            ownerId === getUserId()
          );
        });

        const shopExists = Boolean(ownerShop);

        setHasShop(shopExists);

        if (
          !shopExists &&
          location.pathname !== "/owner/create-shop"
        ) {
          navigate("/owner/create-shop", {
            replace: true,
          });
          return;
        }

        if (
          shopExists &&
          location.pathname === "/owner/create-shop"
        ) {
          navigate("/owner/dashboard", {
            replace: true,
          });
        }
      } catch (error) {
        setShopError(
          error.response?.data?.message ||
            "Failed to check owner shop details."
        );
      } finally {
        setCheckingShop(false);
      }
    };

    checkOwnerShop();
  }, [user, location.pathname, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (checkingShop) {
    return (
      <div className="page-loading">
        Checking shop details...
      </div>
    );
  }

  if (shopError) {
    return (
      <div className="empty-state">
        <h2>Unable to load owner panel</h2>
        <p>{shopError}</p>

        <button
          className="primary-btn"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="owner-layout">
      <aside className="owner-sidebar">
        <div className="owner-logo">QuickPick</div>

        <nav className="owner-nav">
          {hasShop ? (
            <>
              <Link to="/owner/dashboard">
                Dashboard
              </Link>

              <Link to="/owner/shop-settings">
                Shop Settings
              </Link>

              <Link to="/owner/categories">
                Categories
              </Link>

              <Link to="/owner/items">
                Items
              </Link>

              <Link to="/owner/inventory">
                Inventory
              </Link>

              <Link to="/owner/orders">
                Orders
              </Link>

              <Link to="/owner/analytics">
                Analytics
              </Link>

              <Link to="/owner/ai">
                AI Insights
              </Link>
            </>
          ) : (
            <Link to="/owner/create-shop">
              Create Shop
            </Link>
          )}
        </nav>
      </aside>

      <div className="owner-content">
        <header className="owner-topbar">
          <div>
            <h3>Owner Panel</h3>
            <p>Welcome, {user?.name}</p>
          </div>

          <button
            className="logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>
        </header>

        <main className="owner-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default OwnerLayout;