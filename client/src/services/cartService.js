import API from "../api/axios";

const notifyCartUpdated = () => {
  window.dispatchEvent(
    new Event("quickpick-cart-updated")
  );
};

export const addToCart = async (cartData) => {
  const response = await API.post("/cart/add", cartData);

  notifyCartUpdated();

  return response.data;
};

export const getMyCarts = async () => {
  const response = await API.get("/cart/my-carts");

  return response.data;
};

export const getCart = async (shopId) => {
  const response = await API.get(`/cart/${shopId}`);

  return response.data;
};

export const updateCartItem = async (cartData) => {
  const response = await API.put("/cart/update", cartData);

  notifyCartUpdated();

  return response.data;
};

export const removeCartItem = async (cartData) => {
  const response = await API.delete("/cart/remove", {
    data: cartData,
  });

  notifyCartUpdated();

  return response.data;
};

export const clearCart = async (shopId) => {
  const response = await API.delete("/cart/clear", {
    data: {
      shop: shopId,
    },
  });

  notifyCartUpdated();

  return response.data;
};