import { useEffect, useState } from "react";
import { Brain, Lightbulb, Package, TrendingUp, ChefHat, ListChecks } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { getAllShops } from "../../services/shopService";
import {
  getBusinessInsights,
  getInventorySuggestions,
  getDemandPrediction,
  getKitchenIntelligence,
  getDailyActionPlan,
} from "../../services/aiService";

const AIInsights = () => {
  const { user } = useAuth();

  const [shop, setShop] = useState(null);
  const [aiData, setAiData] = useState({
    businessInsights: [],
    inventorySuggestions: [],
    demandPrediction: [],
    kitchenIntelligence: [],
    dailyActionPlan: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getUserId = () => user?._id || user?.id;

  const normalizeArray = (data) => {
    if (Array.isArray(data)) return data;

    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.insights)) return data.insights;
    if (Array.isArray(data?.suggestions)) return data.suggestions;
    if (Array.isArray(data?.predictions)) return data.predictions;
    if (Array.isArray(data?.intelligence)) return data.intelligence;
    if (Array.isArray(data?.actionPlan)) return data.actionPlan;
    if (Array.isArray(data?.plan)) return data.plan;
    if (Array.isArray(data?.recommendations)) return data.recommendations;

    if (Array.isArray(data?.businessInsights)) return data.businessInsights;
    if (Array.isArray(data?.inventorySuggestions)) return data.inventorySuggestions;
    if (Array.isArray(data?.demandPrediction)) return data.demandPrediction;
    if (Array.isArray(data?.kitchenIntelligence)) return data.kitchenIntelligence;
    if (Array.isArray(data?.dailyActionPlan)) return data.dailyActionPlan;

    if (Array.isArray(data?.shops)) return data.shops;
    if (Array.isArray(data?.data?.shops)) return data.data.shops;

    if (data && typeof data === "object") return [data];

    return [];
  };

  const findOwnerShop = async () => {
    if (user?.shop) {
      const userShop =
        typeof user.shop === "object" ? user.shop : { _id: user.shop };

      setShop(userShop);
      return userShop;
    }

    const shopResponse = await getAllShops();
    const shops = normalizeArray(shopResponse);

    const ownerShop = shops.find((singleShop) => {
      const ownerId =
        typeof singleShop.owner === "object"
          ? singleShop.owner?._id || singleShop.owner?.id
          : singleShop.owner;

      return ownerId === getUserId();
    });

    if (!ownerShop) {
      throw new Error("No shop found for this owner account.");
    }

    setShop(ownerShop);
    return ownerShop;
  };

  useEffect(() => {
    const loadAIInsights = async () => {
      try {
        setLoading(true);
        setError("");

        const ownerShop = await findOwnerShop();

        const [
          businessResponse,
          inventoryResponse,
          demandResponse,
          kitchenResponse,
          actionPlanResponse,
        ] = await Promise.all([
          getBusinessInsights(ownerShop._id),
          getInventorySuggestions(ownerShop._id),
          getDemandPrediction(ownerShop._id),
          getKitchenIntelligence(ownerShop._id),
          getDailyActionPlan(ownerShop._id),
        ]);

        setAiData({
              businessInsights: normalizeArray(
                businessResponse.insights ||
                  businessResponse.businessInsights ||
                  businessResponse.data?.insights ||
                  businessResponse
              ),

              inventorySuggestions: normalizeArray(
                inventoryResponse.suggestions ||
                  inventoryResponse.inventorySuggestions ||
                  inventoryResponse.data?.suggestions ||
                  inventoryResponse
              ),

              demandPrediction: normalizeArray(
                demandResponse.prediction ||
                  demandResponse.demandPrediction ||
                  demandResponse.data?.prediction ||
                  demandResponse
              ),

              kitchenIntelligence: normalizeArray(
                kitchenResponse.kitchen ||
                  kitchenResponse.kitchenIntelligence ||
                  kitchenResponse.data?.kitchen ||
                  kitchenResponse
              ),

              dailyActionPlan: normalizeArray(
                actionPlanResponse.actionPlan ||
                  actionPlanResponse.dailyActionPlan ||
                  actionPlanResponse.data?.actionPlan ||
                  actionPlanResponse
              ),
            });
      } catch (error) {
        setError(
          error.response?.data?.message ||
            error.message ||
            "Failed to load AI insights."
        );
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadAIInsights();
    }
  }, [user]);

  const formatLabel = (key) => {
    return key.replaceAll("_", " ").replaceAll("-", " ");
  };

  const renderValue = (value) => {
      if (value === null || value === undefined) return "N/A";

      if (Array.isArray(value)) {
        return value
          .map((item) => {
            if (typeof item === "object") {
              return item.reason || item.item || item.name || JSON.stringify(item);
            }

            return item;
          })
          .join(" | ");
      }

      if (typeof value === "object") {
        return (
          value.name ||
          value.title ||
          value.message ||
          value.reason ||
          JSON.stringify(value)
        );
      }

      return value;
    };

  const renderInsightList = (items, emptyMessage) => {
  if (!items || items.length === 0) {
    return <p className="muted-text">{emptyMessage}</p>;
  }

  return (
    <div className="ai-list">
      {items.map((item, index) => {
        if (typeof item === "string") {
          return (
            <div className="ai-card" key={index}>
              <p className="ai-message">{item}</p>
            </div>
          );
        }

        if (Array.isArray(item)) {
          return (
            <div className="ai-card" key={index}>
              {item.map((value, innerIndex) => (
                <p className="ai-message" key={innerIndex}>
                  {renderValue(value)}
                </p>
              ))}
            </div>
          );
        }

        return (
          <div className="ai-card" key={item._id || index}>
            {item.title && <h3>{item.title}</h3>}
            {item.message && <p className="ai-message">{item.message}</p>}

            <div className="ai-details">
              {Object.entries(item).map(([key, value]) => {
                if (
                  key === "_id" ||
                  key === "__v" ||
                  key === "title" ||
                  key === "message"
                ) {
                  return null;
                }

                return (
                  <div key={key}>
                    <span>{formatLabel(key)}</span>
                    <strong>{renderValue(value)}</strong>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

  if (loading) {
    return <div className="page-loading">Loading AI insights...</div>;
  }

  if (error) {
    return (
      <div className="empty-state">
        <h2>AI Insights not available</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="ai-page">
      <div className="page-header">
        <div>
          <h1>AI Insights</h1>
          <p>
            {shop?.name
              ? `Smart recommendations for ${shop.name}`
              : "Smart business recommendations"}
          </p>
        </div>
      </div>

      <div className="ai-hero-card">
        <div className="ai-hero-icon">
          <Brain size={34} />
        </div>

        <div>
          <h2>QuickPick AI Assistant</h2>
          <p>
            Analyze orders, inventory, customer activity, demand patterns, and kitchen load to help owners make better daily decisions.
          </p>
        </div>
      </div>

      <div className="ai-grid">
        <div className="dashboard-section">
          <div className="section-title-row">
            <Lightbulb size={22} />
            <h2>Business Insights</h2>
          </div>
          {renderInsightList(
            aiData.businessInsights,
            "No business insights available yet."
          )}
        </div>

        <div className="dashboard-section">
          <div className="section-title-row">
            <Package size={22} />
            <h2>Inventory Suggestions</h2>
          </div>
          {renderInsightList(
            aiData.inventorySuggestions,
            "No inventory suggestions available yet."
          )}
        </div>

        <div className="dashboard-section">
          <div className="section-title-row">
            <TrendingUp size={22} />
            <h2>Demand Prediction</h2>
          </div>
          {renderInsightList(
            aiData.demandPrediction,
            "No demand prediction available yet."
          )}
        </div>

        <div className="dashboard-section">
          <div className="section-title-row">
            <ChefHat size={22} />
            <h2>Kitchen Intelligence</h2>
          </div>
          {renderInsightList(
            aiData.kitchenIntelligence,
            "No kitchen intelligence available yet."
          )}
        </div>

        <div className="dashboard-section">
          <div className="section-title-row">
            <ListChecks size={22} />
            <h2>Daily Action Plan</h2>
          </div>
          {renderInsightList(
            aiData.dailyActionPlan,
            "No daily action plan available yet."
          )}
        </div>
      </div>
    </div>
  );
};

export default AIInsights;