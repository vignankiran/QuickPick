import API from "../api/axios";

export const getCategoriesByShop = async (shopId) => {
  const res = await API.get(`/categories/shop/${shopId}`);
  return res.data;
};

export const createCategory = async (categoryData) => {
  const res = await API.post("/categories", categoryData);
  return res.data;
};

export const deleteCategory = async (categoryId) => {
  const res = await API.delete(`/categories/${categoryId}`);
  return res.data;
};