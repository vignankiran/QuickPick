const TIME_ZONE = "Asia/Kolkata";

exports.getLocalDate = () => {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: TIME_ZONE,
  });
};

exports.getLocalDayRange = () => {
  const today = exports.getLocalDate();

  return {
    startOfDay: new Date(`${today}T00:00:00.000+05:30`),
    endOfDay: new Date(`${today}T23:59:59.999+05:30`),
  };
};