import API from "../api/axios";

export const getOwnerDashboard = async (shopId) => {
  const res = await API.get(`/dashboard/owner/${shopId}`);
  return res.data;
};