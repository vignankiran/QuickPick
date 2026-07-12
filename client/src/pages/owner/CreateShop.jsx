import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { createShop } from "../../services/shopService";

const initialForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "Andhra Pradesh",
  pincode: "",
  openingTime: "06:00",
  closingTime: "22:00",
  acceptsPreOrders: true,
  maxOrdersPerSlot: 10,
};

const CreateShop = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(initialForm);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const createSlug = (name) => {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.phone.trim() ||
      !formData.address.trim() ||
      !formData.city.trim() ||
      !formData.state.trim() ||
      !formData.pincode.trim()
    ) {
      setError(
        "Shop name, phone, address, city, state, and pincode are required."
      );
      return;
    }

    const maxOrders = Number(formData.maxOrdersPerSlot);

    if (!Number.isInteger(maxOrders) || maxOrders < 1) {
      setError("Maximum orders per slot must be at least 1.");
      return;
    }

    const slug = createSlug(formData.name);

    if (!slug) {
      setError("Please enter a valid shop name.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      await createShop({
        ...formData,
        slug,
        maxOrdersPerSlot: maxOrders,
        serviceSlots: [],
      });

      navigate("/owner/dashboard", {
        replace: true,
      });
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to create shop. Please try again."
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="owner-create-shop-page">
      <div className="page-header">
        <div>
          <span className="hero-badge">Owner Setup</span>
          <h1>Create Your Shop</h1>
          <p>
            Add the basic shop details to start managing menu items,
            inventory, and customer orders.
          </p>
        </div>
      </div>

      <div className="dashboard-section">
        {error && <div className="error-message">{error}</div>}

        <form className="shop-settings-form" onSubmit={handleSubmit}>
          <div className="shop-details-grid">
            <div className="form-group">
              <label>Shop Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Example: Sai Durga Tiffin Center"
              />
            </div>

            <div className="form-group">
              <label>Shop Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter contact number"
              />
            </div>

            <div className="form-group">
              <label>Shop Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Optional email"
              />
            </div>

            <div className="form-group">
              <label>Pincode</label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                placeholder="Enter pincode"
              />
            </div>

            <div className="form-group full-width">
              <label>Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter complete shop address"
              />
            </div>

            <div className="form-group">
              <label>City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Enter city"
              />
            </div>

            <div className="form-group">
              <label>State</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="Enter state"
              />
            </div>

            <div className="form-group">
              <label>General Opening Time</label>
              <input
                type="time"
                name="openingTime"
                value={formData.openingTime}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>General Closing Time</label>
              <input
                type="time"
                name="closingTime"
                value={formData.closingTime}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Maximum Orders Per Pickup Slot</label>
              <input
                type="number"
                name="maxOrdersPerSlot"
                min="1"
                value={formData.maxOrdersPerSlot}
                onChange={handleChange}
              />
            </div>

            <label className="checkbox-row">
              <input
                type="checkbox"
                name="acceptsPreOrders"
                checked={formData.acceptsPreOrders}
                onChange={handleChange}
              />

              <span>Accept customer pre-orders</span>
            </label>
          </div>

          <button
            className="primary-btn"
            type="submit"
            disabled={creating}
          >
            {creating ? "Creating Shop..." : "Create Shop"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateShop;