import API from "../api/axios";

export const getInventoryByShop = async (shopId) => {
  const res = await API.get(`/inventory/shop/${shopId}`);
  return res.data;
};

export const createOrUpdateInventory = async (inventoryData) => {
  const res = await API.post("/inventory", inventoryData);
  return res.data;
};

export const deleteInventory = async (inventoryId) => {
  const res = await API.delete(`/inventory/${inventoryId}`);
  return res.data;
};
export const getAvailableInventoryByShop = async (shopId) => {
  const res = await API.get(`/inventory/available/shop/${shopId}`);
  return res.data;
};
export const carryForwardInventory = async (shopId) => {
  const res = await API.post(`/inventory/carry-forward/${shopId}`);
  return res.data;
};