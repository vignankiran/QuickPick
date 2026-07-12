import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";

import CustomerLayout from "../layouts/CustomerLayout";
import OwnerLayout from "../layouts/OwnerLayout";

import Home from "../pages/customer/Home";

import Dashboard from "../pages/owner/Dashboard";
import Inventory from "../pages/owner/Inventory";
import Orders from "../pages/owner/Orders";
import Analytics from "../pages/owner/Analytics";
import AIInsights from "../pages/owner/AIInsights";
import ShopSettings from "../pages/owner/ShopSettings";
import CreateShop from "../pages/owner/CreateShop";
import ProtectedRoute from "../components/common/ProtectedRoute";
import Categories from "../pages/owner/Categories";
import Items from "../pages/owner/Items";
import ShopMenu from "../pages/customer/ShopMenu";
import Cart from "../pages/customer/Cart";
import MyOrders from "../pages/customer/MyOrders";
import Checkout from "../pages/customer/Checkout";
import CartLanding from "../pages/customer/CartLanding";


const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/" element={<CustomerLayout />}>
            <Route index element={<Home />} />
            <Route path="shops/:shopId" element={<ShopMenu />} />

            <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
              <Route path="cart" element={<CartLanding />} />
              <Route path="cart/:shopId" element={<Cart />} />
              <Route path="checkout/:shopId" element={<Checkout />} />
              <Route path="my-orders" element={<MyOrders />} />
            </Route>
        </Route>
        <Route element={<ProtectedRoute allowedRoles={["owner"]} />}>
          <Route path="/owner" element={<OwnerLayout />}>
            <Route path="create-shop" element={<CreateShop />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="shop-settings" element={<ShopSettings />} />
            <Route path="categories" element={<Categories />} />
            <Route path="items" element={<Items />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="orders" element={<Orders />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="ai" element={<AIInsights />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;