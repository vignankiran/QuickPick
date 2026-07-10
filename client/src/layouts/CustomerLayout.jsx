import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const CustomerLayout = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  
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
                  <Link to="/cart">Cart</Link>
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