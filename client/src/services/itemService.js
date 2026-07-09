import API from "../api/axios";

export const getItemsByShop = async (shopId) => {
  const res = await API.get(`/items/shop/${shopId}`);
  return res.data;
};

export const createItem = async (itemData) => {
  const res = await API.post("/items", itemData);
  return res.data;
};
export const deleteItem = async (itemId) => {
  const res = await API.delete(`/items/${itemId}`);
  return res.data;
};
export const updateItem = async (itemId, itemData) => {
  const res = await API.put(`/items/${itemId}`, itemData);
  return res.data;
};