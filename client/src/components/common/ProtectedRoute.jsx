import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    if (user?.role === "owner") {
      return <Navigate to="/owner/dashboard" replace />;
    }

    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;