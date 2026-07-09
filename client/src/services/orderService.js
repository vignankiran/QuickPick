import API from "../api/axios";

export const getShopOrders = async (shopId) => {
  const res = await API.get(`/orders/shop/${shopId}`);
  return res.data;
};

export const updateOrderStatus = async (orderId, orderStatus) => {
  const res = await API.put(`/orders/status/${orderId}`, {
    orderStatus,
  });

  return res.data;
};
export const placeOrder = async (orderData) => {
  const res = await API.post("/orders/place", orderData);
  return res.data;
};

export const getMyOrders = async () => {
  const res = await API.get("/orders/my-orders");
  return res.data;
};

export const cancelOrder = async (orderId, reason = "Cancelled by customer") => {
  const res = await API.put(`/orders/cancel/${orderId}`, {
    reason,
  });

  return res.data;
};