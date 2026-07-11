import {
  formatShopTime,
  getEnabledServiceSlots,
  getShopTimingStatus,
} from "../../utils/shopTiming";

const ShopTimingDisplay = ({ shop, compact = false }) => {
  const serviceSlots = getEnabledServiceSlots(shop);
  const timingStatus = getShopTimingStatus(shop);

  if (serviceSlots.length === 0) {
    return null;
  }

  return (
    <div
      className={
        compact
          ? "shop-timing-display compact"
          : "shop-timing-display"
      }
    >
      <div className="shop-timing-status-row">
        <span
          className={
            timingStatus.isOpen
              ? "shop-open-status"
              : "shop-closed-status"
          }
        >
          {timingStatus.label}
        </span>

        <span className="shop-timing-message">
          {timingStatus.message}
        </span>
      </div>

      {!compact && (
        <div className="shop-service-slots">
          {serviceSlots.map((slot) => (
            <div
              className="shop-service-slot"
              key={slot._id || `${slot.name}-${slot.openingTime}`}
            >
              <span className="shop-service-slot-name">
                {slot.name}
              </span>

              <span className="shop-service-slot-time">
                {formatShopTime(slot.openingTime)}
                {" – "}
                {formatShopTime(slot.closingTime)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShopTimingDisplay;