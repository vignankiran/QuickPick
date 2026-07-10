import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMyCarts } from "../services/cartService";
const CustomerLayout = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();
      useEffect(() => {
        const loadCartCount = async () => {
          if (!isAuthenticated || user?.role !== "customer") {
            setCartCount(0);
            return;
          }

          try {
            const response = await getMyCarts();

            const carts = Array.isArray(response)
              ? response
              : response?.carts ||
                response?.data?.carts ||
                response?.data ||
                [];

            const totalQuantity = carts.reduce((cartTotal, cart) => {
              const shopQuantity = (cart.items || []).reduce(
                (itemTotal, cartItem) => {
                  return itemTotal + Number(cartItem.quantity || 0);
                },
                0
              );

              return cartTotal + shopQuantity;
            }, 0);

            setCartCount(totalQuantity);
          } catch (error) {
            console.error("CART COUNT ERROR:", error);
            setCartCount(0);
          }
        };

        loadCartCount();

        window.addEventListener(
          "quickpick-cart-updated",
          loadCartCount
        );

        return () => {
          window.removeEventListener(
            "quickpick-cart-updated",
            loadCartCount
          );
        };
      }, [isAuthenticated, user?.role]);
  
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="customer-layout">
      <header className="customer-header">
        <Link to="/" className="logo">
          QuickPick
        </Link>

        <nav className="customer-nav">
          <Link to="/">Home</Link>

          {isAuthenticated && user?.role === "customer" && (
         <>
        <Link to="/cart" className="cart-nav-link">
          <span>Cart</span>

          {cartCount > 0 && (
            <span className="cart-count-badge">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          )}
        </Link>
                  <Link to="/my-orders">My Orders</Link>
                </>
              )}

          {isAuthenticated ? (
            <>
              <span className="user-name">Hi, {user?.name}</span>
              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register" className="nav-register">
                Register
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="customer-main">
        <Outlet />
      </main>
    </div>
  );
};

export default CustomerLayout;