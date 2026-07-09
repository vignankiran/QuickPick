import API from "../api/axios";

export const getPeakHours = async (shopId) => {
  const res = await API.get(`/analytics/owner/${shopId}/peak-hours`);
  return res.data;
};

export const getTopCustomers = async (shopId) => {
  const res = await API.get(`/analytics/owner/${shopId}/top-customers`);
  return res.data;
};

export const getRevenueReport = async (shopId) => {
  const res = await API.get(`/analytics/owner/${shopId}/revenue-report`);
  return res.data;
};

export const getItemPerformance = async (shopId) => {
  const res = await API.get(`/analytics/owner/${shopId}/item-performance`);
  return res.data;
};

export const getWasteAnalysis = async (shopId) => {
  const res = await API.get(`/analytics/owner/${shopId}/waste-analysis`);
  return res.data;
};