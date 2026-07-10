import API from "../api/axios";

export const addToCart = async (cartData) => {
  const res = await API.post("/cart/add", cartData);
  return res.data;
};

export const getCart = async (shopId) => {
  const res = await API.get(`/cart/${shopId}`);
  return res.data;
};

export const updateCartItem = async (cartData) => {
  const res = await API.put("/cart/update", cartData);
  return res.data;
};

export const removeCartItem = async (cartData) => {
  const res = await API.delete("/cart/remove", {
    data: cartData,
  });

  return res.data;
};

export const clearCart = async (shopId) => {
  const res = await API.delete("/cart/clear", {
    data: {
      shop: shopId,
    },
  });

  return res.data;
};
export const getMyCarts = async () => {
  const res = await API.get("/cart/my-carts");
  return res.data;
};