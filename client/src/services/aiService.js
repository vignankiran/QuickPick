import API from "../api/axios";

export const getBusinessInsights = async (shopId) => {
  const res = await API.get(`/ai/owner/${shopId}/business-insights`);
  return res.data;
};

export const getInventorySuggestions = async (shopId) => {
  const res = await API.get(`/ai/owner/${shopId}/inventory-suggestions`);
  return res.data;
};

export const getDemandPrediction = async (shopId) => {
  const res = await API.get(`/ai/owner/${shopId}/demand-prediction`);
  return res.data;
};

export const getKitchenIntelligence = async (shopId) => {
  const res = await API.get(`/ai/owner/${shopId}/kitchen-intelligence`);
  return res.data;
};

export const getDailyActionPlan = async (shopId) => {
  const res = await API.get(`/ai/owner/${shopId}/daily-action-plan`);
  return res.data;
};