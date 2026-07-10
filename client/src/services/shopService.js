import API from "../api/axios";

export const getAllShops = async () => {
  const res = await API.get("/shops");
  return res.data;
};
export const temporaryCloseShop = async (shopId, closeData) => {
  const res = await API.put(`/shops/${shopId}/temporary-close`, closeData);
  return res.data;
};

export const reopenShop = async (shopId) => {
  const res = await API.put(`/shops/${shopId}/reopen`);
  return res.data;
};
export const updateShopDetails = async (shopId, shopData) => {
  const res = await API.put(`/shops/${shopId}`, shopData);
  return res.data;
};