import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const OwnerLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="owner-layout">
      <aside className="owner-sidebar">
        <div className="owner-logo">QuickPick</div>

        <nav className="owner-nav">
            <Link to="/owner/dashboard">Dashboard</Link>
            <Link to="/owner/shop-settings">Shop Settings</Link>
            <Link to="/owner/categories">Categories</Link>
            <Link to="/owner/items">Items</Link>
            <Link to="/owner/inventory">Inventory</Link>
            <Link to="/owner/orders">Orders</Link>
            <Link to="/owner/analytics">Analytics</Link>
            <Link to="/owner/ai">AI Insights</Link>
        </nav>
      </aside>

      <div className="owner-content">
        <header className="owner-topbar">
          <div>
            <h3>Owner Panel</h3>
            <p>Welcome, {user?.name}</p>
          </div>

          <button className="logout-btn" onClick={handleLogout}>
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