import { Link } from "react-router-dom";

const CartLanding = () => {
  return (
    <div className="cart-page">
      <div className="page-header">
        <div>
          <h1>Your Cart</h1>
          <p>Items you add from a restaurant will appear here.</p>
        </div>
      </div>

      <div className="empty-state">
        <h2>Your cart is empty</h2>
        <p>Please choose a restaurant and add items to your cart.</p>

        <Link to="/" className="primary-link-btn">
          Browse Restaurants
        </Link>
      </div>
    </div>
  );
};

export default CartLanding;