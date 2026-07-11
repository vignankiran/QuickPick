const TIME_ZONE = "Asia/Kolkata";

export const formatShopTime = (time) => {
  if (!time || !time.includes(":")) {
    return "";
  }

  const [hours, minutes] = time.split(":").map(Number);

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export const getEnabledServiceSlots = (shop) => {
  if (
    Array.isArray(shop?.serviceSlots) &&
    shop.serviceSlots.length > 0
  ) {
    return shop.serviceSlots
      .filter((slot) => slot.isEnabled !== false)
      .sort((firstSlot, secondSlot) =>
        firstSlot.openingTime.localeCompare(
          secondSlot.openingTime
        )
      );
  }

  // Temporary fallback for older shops
  if (shop?.openingTime && shop?.closingTime) {
    return [
      {
        name: "Shop Hours",
        openingTime: shop.openingTime,
        closingTime: shop.closingTime,
        isEnabled: true,
      },
    ];
  }

  return [];
};

const getCurrentIndiaMinutes = () => {
  const formatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(new Date());

  const hours = Number(
    parts.find((part) => part.type === "hour")?.value || 0
  );

  const minutes = Number(
    parts.find((part) => part.type === "minute")?.value || 0
  );

  return hours * 60 + minutes;
};

const timeToMinutes = (time) => {
  if (!time || !time.includes(":")) {
    return 0;
  }

  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
};

export const getShopTimingStatus = (shop) => {
  if (shop?.isActive === false) {
    return {
      isOpen: false,
      label: "Closed",
      message: "Shop is currently inactive.",
    };
  }

  if (
    shop?.temporaryClosedUntil &&
    new Date(shop.temporaryClosedUntil) > new Date()
  ) {
    return {
      isOpen: false,
      label: "Temporarily Closed",
      message:
        shop.temporaryCloseReason ||
        "Shop is temporarily not accepting orders.",
    };
  }

  const slots = getEnabledServiceSlots(shop);

  if (slots.length === 0) {
    return {
      isOpen: true,
      label: "Open",
      message: "Timing information is not available.",
    };
  }

  const currentMinutes = getCurrentIndiaMinutes();

  const activeSlot = slots.find((slot) => {
    const openingMinutes = timeToMinutes(slot.openingTime);
    const closingMinutes = timeToMinutes(slot.closingTime);

    return (
      currentMinutes >= openingMinutes &&
      currentMinutes < closingMinutes
    );
  });

  if (activeSlot) {
    return {
      isOpen: true,
      label: "Open Now",
      message: `${activeSlot.name} until ${formatShopTime(
        activeSlot.closingTime
      )}`,
      activeSlot,
    };
  }

  const nextSlot = slots.find(
    (slot) =>
      timeToMinutes(slot.openingTime) > currentMinutes
  );

  if (nextSlot) {
    return {
      isOpen: false,
      label: "Currently Closed",
      message: `Next opening: ${
        nextSlot.name
      } at ${formatShopTime(nextSlot.openingTime)}`,
      nextSlot,
    };
  }

  return {
    isOpen: false,
    label: "Closed for Today",
    message: "No more service sessions today.",
  };
};