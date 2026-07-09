import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Store, MapPin, ArrowRight } from "lucide-react";
import { getAllShops } from "../../services/shopService";
import { useAuth } from "../../context/AuthContext";


const Home = () => {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  const [locationQuery, setLocationQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const normalizeArray = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.shops)) return data.shops;
    if (Array.isArray(data?.data?.shops)) return data.data.shops;
    return [];
  };
  useEffect(() => {
    if (isAuthenticated && user?.role === "owner") {
        navigate("/owner/dashboard", { replace: true });
        }
    }, [isAuthenticated, user, navigate]);
    
  useEffect(() => {
    const loadShops = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getAllShops();
        setShops(normalizeArray(response));
      } catch (error) {
        setError(
          error.response?.data?.message ||
            "Failed to load shops. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    loadShops();
  }, []);
    const getShopLocationText = (shop) => {
        return `${shop.city || ""} ${shop.address || ""} ${shop.location || ""}`
            .toLowerCase();
        };

        const filteredShops = locationQuery.trim()
        ? shops.filter((shop) =>
            getShopLocationText(shop).includes(locationQuery.toLowerCase().trim())
            )
        : shops;

  if (loading) {
    return <div className="page-loading">Loading restaurants...</div>;
  }

  if (error) {
    return (
      <div className="empty-state">
        <h2>Restaurants not available</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="customer-home">
      <section className="customer-hero">
        <div>
          <span className="hero-badge">AI-powered food pre-ordering</span>
          <h1>Skip the wait. Order before you arrive.</h1>
          <p>
            QuickPick helps you pre-order food from nearby restaurants so your
            order is ready when you reach the shop.
          </p>
          <div className="location-search-box">
            <input
                type="text"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="Search by city or location, example: Gudivada"
            />
            </div>
        </div>
      </section>

      <section className="shops-section">
        <div className="section-header">
          <div>
            <h2>Available Restaurants</h2>
            <p>Choose a restaurant and explore the menu.</p>
          </div>
        </div>

        {shops.length === 0 ? (
            <div className="empty-state">
                <h2>No restaurants found</h2>
                <p>Restaurants will appear here once owners create their shops.</p>
            </div>
            ) : filteredShops.length === 0 ? (
            <div className="empty-state">
                <h2>No restaurants found for this location</h2>
                <p>Try searching another city or area.</p>
            </div>
            ) : (
            <div className="shops-grid">
                {filteredShops.map((shop) => (
              <Link to={`/shops/${shop._id}`} className="shop-card" key={shop._id}>
                <div className="shop-icon">
                  <Store size={28} />
                </div>

                <div className="shop-info">
                  <h3>{shop.name}</h3>

                  <p>
                    <MapPin size={15} />
                    {shop.address || shop.location || "Location not added"}
                  </p>

                  <span
                      className={
                        shop.isTemporarilyClosed
                          ? "status-badge low_stock"
                          : shop.isActive
                          ? "status-badge available"
                          : "status-badge sold_out"
                      }
                    >
                      {shop.isTemporarilyClosed
                        ? "Temporarily Closed"
                        : shop.isActive
                        ? "Open"
                        : "Closed"}
                    </span>
                </div>

                <ArrowRight className="shop-arrow" size={22} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;